import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { SmsLoaderService } from '../sms-loader.service';
import { SmsStoreService } from '../sms-store.service';

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
    constructor(
        private smsLoaderService: SmsLoaderService,
        private smsStoreService: SmsStoreService
        ) { }

    ngOnInit() {
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
