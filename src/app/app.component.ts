import { Component, OnInit } from '@angular/core';

import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { VcfLoaderComponent } from './vcf-loader/vcf-loader.component';
import { MessageListComponent } from './message-list/message-list.component';
import { SmsStoreService } from './sms-store.service';
import { SmsLoaderService } from './sms-loader.service';
import { VcfLoaderService } from './vcf-loader.service';
import { VcfStoreService } from './vcf-store.service';
import { LoaderStatusUpdate } from './loader-status';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})

export class AppComponent implements OnInit  {
	title = 'SMS Backup Viewer';
    smsloaded: boolean = false;
	vcfloaded: boolean = false;
	country: string = "AU";

	smsStatus: LoaderStatusUpdate = {
		source: 'sms',
		status: 'idle',
		text: 'not loaded',
		updatedAt: 0
	};

	vcfStatus: LoaderStatusUpdate = {
		source: 'vcf',
		status: 'idle',
		text: 'not loaded',
		updatedAt: 0
	};


    constructor(private smsStoreService: SmsStoreService,
				private smsLoaderService: SmsLoaderService,
				private vcfLoaderService: VcfLoaderService,
				private vcfStoreService: VcfStoreService) 
	{
    }
	private getQueryParameter(key: string): string {
		const parameters = new URLSearchParams(window.location.search);
		return parameters.get(key);
	}
	ngOnInit() {
		// Apply default country on startup.
		this.smsStoreService.changeCountry(this.country);
		this.vcfStoreService.changeCountry(this.country);

		// URL override (e.g. ?country=US)
		const qpCountry = this.getQueryParameter('country');
		if (qpCountry) {
			this.country = qpCountry;
			this.smsStoreService.changeCountry(this.country);
			this.vcfStoreService.changeCountry(this.country);
		}

		// If there's persisted data (IndexedDB mode), restore it on startup.
		this.smsStoreService.restoreFromIndexedDbIfEnabled().then((restored) => {
			if (restored) {
				this.smsloaded = true;
				this.smsStoreService.broadcastMessagesLoaded(true);
			}
		});
	}

	onSmsStatusChanged(update: LoaderStatusUpdate): void {
		this.smsStatus = this.mergeStatus(this.smsStatus, update, 'sms');
	}

	onVcfStatusChanged(update: LoaderStatusUpdate): void {
		this.vcfStatus = this.mergeStatus(this.vcfStatus, update, 'vcf');
	}

	private mergeStatus(
		current: LoaderStatusUpdate,
		incoming: LoaderStatusUpdate,
		expectedSource: 'sms' | 'vcf'
	): LoaderStatusUpdate {
		if (!incoming || incoming.source !== expectedSource) {
			return current;
		}
		// Prefer newest update; fall back to current if timestamps are missing.
		const currentAt = current?.updatedAt ?? 0;
		const incomingAt = incoming?.updatedAt ?? 0;
		if (incomingAt < currentAt) {
			return current;
		}
		return incoming;
	}
    onSmsLoaded(loaded: boolean) {
        if (loaded) {
            if (this.smsloaded) {
                this.smsloaded = false;
                this.smsStoreService.clearAllMessages().then(() => {
					this.loadMessages(loaded);
                });
            } else {
				this.loadMessages(loaded);
            }
        }		
    }
	
	onVcfLoaded(loaded: boolean) {
		if (this.vcfloaded) {
			this.vcfloaded = false;
			this.vcfStoreService.clearAllContacts().then(() => {
				this.loadContacts(loaded);				
			});
		} else {
			this.loadContacts(loaded);			
		}
		
	}
	
	
    private loadMessages(loaded: boolean): void {
		// If a Tauri streaming load already populated the store, don't re-load from SmsLoaderService.
		if (this.smsStoreService.messagesLoaded) {
			this.smsloaded = loaded;
			if (this.vcfloaded && loaded) {
				this.vcfStoreService.getAllContacts().then((contactsMap) => {
					this.smsStoreService.fillContactNames(contactsMap);
					this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);
				});
			}
			if (loaded) {
				this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);
			}
			return;
		}

		this.smsLoaderService.getLoadedMessages().then((messages) => {
			if (!messages?.length) {
				return;
			}
			this.smsStoreService.loadAllMessages(messages).then(() => {
				this.smsloaded = loaded;
				if (this.vcfloaded && loaded) {
					this.vcfStoreService.getAllContacts().then((contactsMap) => {
						this.smsStoreService.fillContactNames(contactsMap);
						this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);
					});
				}
				if (loaded) {
					this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);
				}
			});
		});
    }
	
	private loadContacts(loaded: boolean): void {
        this.vcfLoaderService.getLoadedContacts().then(contacts => {
            this.vcfStoreService.loadAllContacts(contacts).then(() => {
                this.vcfloaded = loaded;
				if (this.smsloaded) {
					this.vcfStoreService.getAllContacts().then(contactsMap => {
					this.smsStoreService.fillContactNames(contactsMap);	
					});
				}
            });
        });
    }
    
}
