import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { SmsLoaderService } from '../sms-loader.service';
import { SmsStoreService } from '../sms-store.service';
import { Message } from '../message';

@Component({
    selector: 'sms-loader',
    templateUrl: './sms-loader.component.html',
    styleUrls: ['./sms-loader.component.css'],
    standalone: false
})
export class SmsLoaderComponent implements OnInit {
    @Output() onLoaded = new EventEmitter<boolean>();
    sampleText: string = 'not loaded';
    loaded: boolean = false;
	isTauri: boolean = false;
    tauriPath: string = '';
	private unlistenFns: Array<() => void> = [];
	private parsedCount: number = 0;
	private totalBytes: number = 0;
	private bytesRead: number = 0;
    constructor(
        private smsLoaderService: SmsLoaderService,
        private smsStoreService: SmsStoreService
        ) { }

    ngOnInit() {
        this.isTauri = this.detectTauri();
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
        // Tauri v2 injects a global __TAURI__ object for IPC.
        return typeof (window as any)?.__TAURI__ !== 'undefined';
    }

    private tauriInvoke<T>(command: string, args?: Record<string, any>): Promise<T> {
        const tauri = (window as any)?.__TAURI__;
        const invoke = tauri?.core?.invoke;
        if (typeof invoke !== 'function') {
            return Promise.reject(new Error('Tauri invoke not available.'));
        }
        return invoke(command, args ?? {});
    }

    private async tauriListen<T>(eventName: string, handler: (payload: T) => void): Promise<void> {
        const tauri = (window as any)?.__TAURI__;
        const listen = tauri?.event?.listen;
        if (typeof listen !== 'function') {
            throw new Error('Tauri event.listen not available.');
        }
        const unlisten = await listen(eventName, (event: any) => handler(event?.payload));
        if (typeof unlisten === 'function') {
            this.unlistenFns.push(unlisten);
        }
    }

    private resetProgress(): void {
        this.parsedCount = 0;
        this.totalBytes = 0;
        this.bytesRead = 0;
    }

    private progressText(): string {
        if (this.totalBytes > 0 && this.bytesRead >= 0) {
            return `Parsing... ${this.formatBytes(this.bytesRead)} / ${this.formatBytes(this.totalBytes)} (${this.parsedCount.toLocaleString()} msgs)`;
        }
        return `Parsing... (${this.parsedCount.toLocaleString()} msgs)`;
    }

    async loadFromTauriPath(): Promise<void> {
        if (!this.isTauri) {
            this.sampleText = 'Not running under Tauri.';
            this.onLoaded.emit(false);
            return;
        }
        const path = (this.tauriPath || '').trim();
        if (!path) {
            this.sampleText = 'Enter a file path to an XML backup.';
            this.onLoaded.emit(false);
            return;
        }

        this.sampleText = 'Starting Tauri parse...';
        this.loaded = false;
        this.resetProgress();
        this.smsStoreService.beginIngest();

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
        });

        await this.tauriListen<ParseProgress>('sms_parse_progress', (p) => {
            this.bytesRead = p?.bytesRead ?? this.bytesRead;
            this.totalBytes = p?.totalBytes ?? this.totalBytes;
            this.parsedCount = p?.parsedCount ?? this.parsedCount;
            this.sampleText = this.progressText();
        });

        await this.tauriListen<string>('sms_parse_error', (err) => {
            this.sampleText = `Failed to load: ${String(err ?? 'Unknown error')}`;
            this.loaded = false;
            this.onLoaded.emit(false);
        });

        await this.tauriListen<ParseDone>('sms_parse_done', (done) => {
            this.bytesRead = done?.bytesRead ?? this.bytesRead;
            this.totalBytes = done?.totalBytes ?? this.totalBytes;
            this.parsedCount = done?.parsedCount ?? this.parsedCount;
            this.smsStoreService.finishIngest();
            this.smsStoreService.broadcastMessagesLoaded(true);
            this.sampleText = `Loaded! (${this.parsedCount.toLocaleString()} msgs)`;
            this.loaded = true;
            this.onLoaded.emit(true);
        });

        try {
            await this.tauriInvoke<void>('start_parse_sms_backup', { path });
            this.sampleText = this.progressText();
        } catch (e) {
            this.sampleText = `Failed to start parse: ${(e as any)?.message ?? String(e)}`;
            this.loaded = false;
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
        this.loaded = false;

        const selected: File[] = Array.from(fileEvent?.target?.files ?? []);
        if (selected.length >= 1) {

            // Guard: very large XML backups (especially with MMS media) are not feasible to parse
            // in-browser with DOMParser + full-string FileReader.
            const MAX_BYTES = 250 * 1024 * 1024; // 250 MB
            const tooLarge = selected.find((f) => f.size > MAX_BYTES);
            if (tooLarge) {
                this.sampleText = `File too large (${this.formatBytes(tooLarge.size)}). Export a smaller XML (no media) or split it.`;
                this.onLoaded.emit(false);
                this.loaded = false;
                if (fileEvent?.target) {
                    fileEvent.target.value = '';
                }
                return;
            }

            this.sampleText = `Loading 1/${selected.length}...`;
            this.smsLoaderService
                .loadSMSFiles(selected)
                .then(() => {
                    this.sampleText = 'Loaded!';
                    this.onLoaded.emit(true);
                    this.loaded = true;
                })
                .catch((err) => {
                    this.sampleText = 'Failed to load';
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

}
