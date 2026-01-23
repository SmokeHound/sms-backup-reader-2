import { Component, OnInit, HostListener } from '@angular/core';

import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { VcfLoaderComponent } from './vcf-loader/vcf-loader.component';
import { MessageListComponent } from './message-list/message-list.component';
import { SmsStoreService } from './sms-store.service';
import { SmsLoaderService } from './sms-loader.service';
import { VcfLoaderService } from './vcf-loader.service';
import { VcfStoreService } from './vcf-store.service';
import { LoaderStatusUpdate } from './loader-status';
import { APP_VERSION, APP_BUILD_TIME, APP_GIT_COMMIT } from './version';
import { LogService } from './log.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})

export class AppComponent implements OnInit  {
	title = 'SMS Backup Viewer';
	appVersion = APP_VERSION;
	appBuildTime = APP_BUILD_TIME;
	appGitCommit = (typeof APP_GIT_COMMIT !== 'undefined') ? APP_GIT_COMMIT : '';
	get appVersionTooltip(): string {
		let t = `v${this.appVersion} — built ${this.appBuildTime}`;
		if (this.appGitCommit) {
			t += ` — ${this.appGitCommit}`;
		}
		return t;
	}

	// About dialog control
	showAbout: boolean = false;
	openAbout() { this.showAbout = true; }
	closeAbout() { this.showAbout = false; }

	@HostListener('window:keydown', ['$event'])
	handleKeyDown(event: KeyboardEvent) {
		const isMac = (navigator.platform || '').toLowerCase().includes('mac');
		const mod = isMac ? event.metaKey : event.ctrlKey;
		if (mod && (event.key === 'i' || event.key === 'I')) {
			event.preventDefault();
			this.openAbout();
		}
	}
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
				private vcfStoreService: VcfStoreService,
				private logs: LogService) 
	{
    }
	private getQueryParameter(key: string): string {
		const parameters = new URLSearchParams(window.location.search);
		return parameters.get(key);
	}
	ngOnInit() {
		this.logs.info('App started', {
			version: this.appVersion,
			buildTime: this.appBuildTime,
			commit: this.appGitCommit || undefined
		});

		// Apply default country on startup.
		this.smsStoreService.changeCountry(this.country);
		this.vcfStoreService.changeCountry(this.country);

		// URL override (e.g. ?country=US)
		const qpCountry = this.getQueryParameter('country');
		if (qpCountry) {
			this.country = qpCountry;
			this.smsStoreService.changeCountry(this.country);
			this.vcfStoreService.changeCountry(this.country);
			this.logs.info('Country override applied', { country: this.country });
		}

		// If there's persisted data (IndexedDB mode), restore it on startup.
		this.smsStoreService
			.restoreFromIndexedDbIfEnabled()
			.then((restored) => {
				if (restored) {
					this.logs.info('Restored messages from IndexedDB');
					this.smsloaded = true;
					this.smsStoreService.broadcastMessagesLoaded(true);
				}
			})
			.catch((e) => {
				this.logs.error('Failed to restore from IndexedDB', e);
			});
	}

	onSmsStatusChanged(update: LoaderStatusUpdate): void {
		const prev = this.smsStatus;
		const next = this.mergeStatus(this.smsStatus, update, 'sms');
		this.smsStatus = next;
		this.logStatusTransition('SMS', prev, next);
	}

	onVcfStatusChanged(update: LoaderStatusUpdate): void {
		const prev = this.vcfStatus;
		const next = this.mergeStatus(this.vcfStatus, update, 'vcf');
		this.vcfStatus = next;
		this.logStatusTransition('Contacts', prev, next);
	}

	private logStatusTransition(label: string, prev: LoaderStatusUpdate, next: LoaderStatusUpdate): void {
		if (!next) return;
		const changed = prev?.status !== next.status || prev?.text !== next.text;
		if (!changed) return;

		const msg = `[${label}] ${next.text || next.status}`;
		switch (next.status) {
			case 'error':
				this.logs.error(msg, next);
				break;
			case 'ok':
				this.logs.info(msg, next);
				break;
			case 'busy':
				this.logs.debug(msg, next);
				break;
			default:
				this.logs.debug(msg, next);
				break;
		}
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
			this.logs.info('SMS import completed');
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
		if (loaded) {
			this.logs.info('Contacts import completed');
		}
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
