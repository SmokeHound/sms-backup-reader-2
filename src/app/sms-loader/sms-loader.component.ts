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

    fileChange(fileEvent: any): void {
        this.sampleText = 'Loading...';
        this.loaded = false;

        var file: File;
        if (fileEvent.target.files && fileEvent.target.files.length >= 1) {
            file = fileEvent.target.files[0];
            this.smsLoaderService
                .loadSMSFile(file)
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
