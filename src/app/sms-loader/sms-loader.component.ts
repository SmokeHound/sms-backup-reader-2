import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { SmsLoaderService } from '../sms-loader.service';
import { SmsStoreService } from '../sms-store.service';
import { Message } from '../message';
import { LoaderStatusUpdate } from '../loader-status';

@Component({
    selector: 'sms-loader',
    templateUrl: './sms-loader.component.html',
    styleUrls: ['./sms-loader.component.css'],
    standalone: false
})
export class SmsLoaderComponent implements OnInit {
    @Output() onLoaded = new EventEmitter<boolean>();
    @Output() statusChanged = new EventEmitter<LoaderStatusUpdate>();
    sampleText: string = 'not loaded';
    loaded: boolean = false;
    status: 'idle' | 'busy' | 'ok' | 'error' = 'idle';
	isTauri: boolean = false;
    tauriPath: string = '';
	private unlistenFns: Array<() => void> = [];
    parsedCount: number = 0;
    totalBytes: number = 0;
    bytesRead: number = 0;
    constructor(
        private smsLoaderService: SmsLoaderService,
        private smsStoreService: SmsStoreService
        ) { }

    ngOnInit() {
        this.isTauri = this.detectTauri();
		this.status = 'idle';
		this.emitStatus();
    }

    ngOnDestroy() {
        this.unlistenFns.forEach((fn) => {
            try {
                fn();
            } catch {
                // ignore
            }
        });
        this.unlistenFns = [];
    }

    private detectTauri(): boolean {
        // Robust detection for installed desktop builds.
        // In production, Tauri uses a custom protocol (e.g. tauri://localhost).
        const protocol = (window?.location?.protocol ?? '').toLowerCase();
        if (protocol === 'tauri:' || protocol === 'asset:') {
            return true;
        }
        // Fallback: some environments still inject a global __TAURI__ object.
        return typeof (window as any)?.__TAURI__ !== 'undefined';
    }

    private async tauriInvoke<T>(command: string, args?: Record<string, any>): Promise<T> {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            return invoke<T>(command, args ?? {});
        } catch {
            return Promise.reject(new Error('Tauri invoke not available.'));
        }
    }

    private async tauriListen<T>(eventName: string, handler: (payload: T) => void): Promise<void> {
        try {
            const { listen } = await import('@tauri-apps/api/event');
            const unlisten = await listen<T>(eventName, (event) => handler((event as any)?.payload));
            if (typeof unlisten === 'function') {
                this.unlistenFns.push(unlisten);
            }
        } catch {
            throw new Error('Tauri event.listen not available.');
        }
    }

    private resetProgress(): void {
        this.parsedCount = 0;
        this.totalBytes = 0;
        this.bytesRead = 0;
    }

    get progressPercent(): number {
        if (!this.totalBytes || this.totalBytes <= 0) {
            return 0;
        }
        const pct = (this.bytesRead / this.totalBytes) * 100;
        if (!Number.isFinite(pct)) {
            return 0;
        }
        return Math.max(0, Math.min(100, pct));
    }

    private progressText(): string {
        if (this.totalBytes > 0 && this.bytesRead >= 0) {
            return `Parsing... ${this.formatBytes(this.bytesRead)} / ${this.formatBytes(this.totalBytes)} (${this.parsedCount.toLocaleString()} msgs)`;
        }
        return `Parsing... (${this.parsedCount.toLocaleString()} msgs)`;
    }

    async browseForTauriPath(): Promise<void> {
        if (!this.isTauri) {
            return;
        }
        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({
                multiple: false,
                directory: false,
                title: 'Select SMS Backup XML',
                filters: [{ name: 'XML files', extensions: ['xml'] }]
            });
            if (typeof selected === 'string' && selected.trim()) {
                this.tauriPath = selected;
            }
        } catch (e) {
            this.sampleText = `Failed to open file picker: ${(e as any)?.message ?? String(e)}`;
            this.status = 'error';
            this.emitStatus();
        }
    }

    async browseAndLoadFromTauriPath(): Promise<void> {
        if (!this.isTauri) {
            this.sampleText = 'Not running under Tauri.';
            this.status = 'error';
            this.emitStatus();
            return;
        }
        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({
                multiple: false,
                directory: false,
                title: 'Select SMS Backup XML',
                filters: [{ name: 'XML files', extensions: ['xml'] }]
            });
            if (typeof selected === 'string' && selected.trim()) {
                this.tauriPath = selected;
                await this.loadFromTauriPath();
            }
        } catch (e) {
            this.sampleText = `Failed to open file picker: ${(e as any)?.message ?? String(e)}`;
            this.status = 'error';
            this.emitStatus();
        }
    }

    async loadFromTauriPath(): Promise<void> {
        if (!this.isTauri) {
            this.sampleText = 'Not running under Tauri.';
            this.status = 'error';
			this.emitStatus();
            this.onLoaded.emit(false);
            return;
        }
        const path = (this.tauriPath || '').trim();
        if (!path) {
            this.sampleText = 'Enter a file path to an XML backup.';
            this.status = 'error';
			this.emitStatus();
            this.onLoaded.emit(false);
            return;
        }

        this.sampleText = 'Starting Tauri parse...';
        this.status = 'busy';
        this.loaded = false;
        this.resetProgress();
		this.emitStatus();
        this.smsStoreService.beginIngest({ persistToIndexedDb: true, clearIndexedDb: true });

        // Clear prior listeners for repeated loads.
        this.unlistenFns.forEach((fn) => {
            try {
                fn();
            } catch {
                // ignore
            }
        });
        this.unlistenFns = [];

        type ParsedMessage = {
            contactAddress: string;
            contactName?: string | null;
            type: number;
            timestamp: string;
            dateMs: number;
            body: string;
        };
        type ParseBatch = {
            messages: ParsedMessage[];
            bytesRead: number;
            totalBytes: number;
            parsedCount: number;
        };
        type ParseProgress = {
            bytesRead: number;
            totalBytes: number;
            parsedCount: number;
        };
        type ParseDone = {
            bytesRead: number;
            totalBytes: number;
            parsedCount: number;
        };

        await this.tauriListen<ParseBatch>('sms_parse_batch', (batch) => {
            if (!batch?.messages?.length) {
                return;
            }
            this.bytesRead = batch.bytesRead ?? this.bytesRead;
            this.totalBytes = batch.totalBytes ?? this.totalBytes;
            this.parsedCount = batch.parsedCount ?? this.parsedCount;

            const msgs: Message[] = batch.messages.map((m) => {
                return {
                    contactAddress: m.contactAddress,
                    contactName: (m.contactName ?? null) as any,
                    type: m.type,
                    timestamp: m.timestamp,
                    date: new Date(m.dateMs),
                    body: m.body
                } as any;
            });
            this.smsStoreService.ingestMessagesBatch(msgs);
            this.sampleText = this.progressText();
            this.status = 'busy';
			this.emitStatus();
        });

        await this.tauriListen<ParseProgress>('sms_parse_progress', (p) => {
            this.bytesRead = p?.bytesRead ?? this.bytesRead;
            this.totalBytes = p?.totalBytes ?? this.totalBytes;
            this.parsedCount = p?.parsedCount ?? this.parsedCount;
            this.sampleText = this.progressText();
            this.status = 'busy';
			this.emitStatus();
        });

        await this.tauriListen<string>('sms_parse_error', (err) => {
            this.sampleText = `Failed to load: ${String(err ?? 'Unknown error')}`;
            this.status = 'error';
            this.loaded = false;
			this.emitStatus();
            this.onLoaded.emit(false);
        });

        await this.tauriListen<ParseDone>('sms_parse_done', async (done) => {
            this.bytesRead = done?.bytesRead ?? this.bytesRead;
            this.totalBytes = done?.totalBytes ?? this.totalBytes;
            this.parsedCount = done?.parsedCount ?? this.parsedCount;
			await this.smsStoreService.finishIngestAsync();
            this.smsStoreService.broadcastMessagesLoaded(true);
            this.sampleText = `Loaded! (${this.parsedCount.toLocaleString()} msgs)`;
            this.status = 'ok';
            this.loaded = true;
			this.emitStatus();
            this.onLoaded.emit(true);
        });

        try {
            await this.tauriInvoke<void>('start_parse_sms_backup', { path });
            this.sampleText = this.progressText();
            this.status = 'busy';
			this.emitStatus();
        } catch (e) {
            this.sampleText = `Failed to start parse: ${(e as any)?.message ?? String(e)}`;
            this.status = 'error';
            this.loaded = false;
			this.emitStatus();
            this.onLoaded.emit(false);
        }
    }

    private formatBytes(bytes: number): string {
        if (!Number.isFinite(bytes) || bytes < 0) {
            return String(bytes);
        }
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }

    fileChange(fileEvent: any): void {
        this.sampleText = 'Loading...';
		this.status = 'busy';
        this.loaded = false;
		this.emitStatus();

        const selected: File[] = Array.from(fileEvent?.target?.files ?? []);
        if (selected.length >= 1) {

            // Guard: very large XML backups (especially with MMS media) are not feasible to parse
            // in-browser with DOMParser + full-string FileReader.
            const MAX_BYTES = 250 * 1024 * 1024; // 250 MB
            const tooLarge = selected.find((f) => f.size > MAX_BYTES);
            if (tooLarge) {
                if (this.isTauri) {
                    this.sampleText = `File too large for browser upload (${this.formatBytes(tooLarge.size)}). Use "Load from path (Tauri)" for large backups.`;
                } else {
                    this.sampleText = `File too large for in-browser import (${this.formatBytes(tooLarge.size)}). For large backups, use the desktop app (Tauri) and "Load from path". If you must use the browser, export without media to reduce the file size.`;
                }
				this.status = 'error';
				this.emitStatus();
                this.onLoaded.emit(false);
                this.loaded = false;
                if (fileEvent?.target) {
                    fileEvent.target.value = '';
                }
                return;
            }

            this.sampleText = `Loading 1/${selected.length}...`;
			this.emitStatus();
            this.smsLoaderService
                .loadSMSFiles(selected)
                .then(() => {
                    this.sampleText = 'Loaded!';
					this.status = 'ok';
					this.emitStatus();
                    this.onLoaded.emit(true);
                    this.loaded = true;
                })
                .catch((err) => {
                    this.sampleText = 'Failed to load';
					this.status = 'error';
					this.emitStatus();
                    this.onLoaded.emit(false);
                    this.loaded = false;
                    console.error('Failed to load SMS backup file', err);
                })
                .finally(() => {
                    // Allow selecting the same file again.
                    if (fileEvent?.target) {
                        fileEvent.target.value = '';
                    }
                });
        }
    }

    private emitStatus(): void {
        this.statusChanged.emit({
            source: 'sms',
            status: this.status,
            text: this.sampleText,
            updatedAt: Date.now(),
            progressPercent: this.status === 'busy' ? this.progressPercent : undefined,
            bytesRead: this.bytesRead,
            totalBytes: this.totalBytes,
            parsedCount: this.parsedCount
        });
    }

}
