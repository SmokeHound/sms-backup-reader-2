import { AfterViewInit, Component, ElementRef, NgZone, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { Message } from '../message';
import { Contact } from '../contact';
import { SmsStoreService }  from '../sms-store.service';
import { CsvExportService } from '../csv-export.service';
import { ExportOptions } from './export-options-dialog.component';

@Component({
    selector: 'message-list',
    templateUrl: './message-list.component.html',
    styleUrls: ['./message-list.component.css'],
    standalone: false
})

export class MessageListComponent implements OnInit, AfterViewInit {

    messages: Message[];
    messageMap: Map<string, Message[]>;

    messagesLoaded: boolean;
    loadingSubscription: Subscription;
    contactClickedSubscription: Subscription;
    selectedContact: Contact;
    
    showExportDialog = false;
    loadingOlder = false;
    hasMoreMessages = false;
    private oldestLoadedDateMs: number | null = null;
    private readonly pageSize = 500;
    private readonly autoLoadThresholdPx = 220;
    private readonly autoLoadMinIntervalMs = 750;
    private lastAutoLoadAtMs = 0;
    private scrollRafPending = false;
    private scrollContainerEl: HTMLElement | null = null;
    private detachScrollListener: (() => void) | null = null;

        constructor(
		private smsStoreService: SmsStoreService,
        private csvExportService: CsvExportService,
        private elementRef: ElementRef<HTMLElement>,
        private ngZone: NgZone
	) { }

    ngOnInit() {
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
        .subscribe(messagesLoaded => {
            this.messagesLoaded = messagesLoaded;
            this.getAllMessages();
            return;
        });

        this.contactClickedSubscription = this.smsStoreService.contactClicked$
        .subscribe(contact => {
            this.selectedContact = contact;
            if (contact) {
                this.loadLatestForSelectedContact();
            }
            return;
        });
    }

    ngAfterViewInit(): void {
        this.initScrollContainer();
    }

    private initScrollContainer(): void {
        this.scrollContainerEl = this.elementRef?.nativeElement?.closest('.messages') as HTMLElement | null;
        if (!this.scrollContainerEl) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            const handler = () => {
                if (this.scrollRafPending) {
                    return;
                }
                this.scrollRafPending = true;
                requestAnimationFrame(() => {
                    this.scrollRafPending = false;
                    this.ngZone.run(() => this.maybeAutoLoadOlder());
                });
            };

            this.scrollContainerEl!.addEventListener('scroll', handler, { passive: true });
            this.detachScrollListener = () => this.scrollContainerEl?.removeEventListener('scroll', handler as any);
        });
    }

    private maybeAutoLoadOlder(): void {
        const el = this.scrollContainerEl;
        if (!el || !this.hasMoreMessages || this.loadingOlder) {
            return;
        }
        if (el.scrollTop > this.autoLoadThresholdPx) {
            return;
        }
        const now = Date.now();
        if (now - this.lastAutoLoadAtMs < this.autoLoadMinIntervalMs) {
            return;
        }
        this.lastAutoLoadAtMs = now;
        void this.loadOlderMessages();
    }

    private async loadLatestForSelectedContact(): Promise<void> {
        this.messages = [];
        this.oldestLoadedDateMs = null;
        this.hasMoreMessages = false;
        this.loadingOlder = false;

        const contact = this.selectedContact;
        if (!contact?.address) {
            return;
        }
        const msgs = await this.smsStoreService.getLatestMessages(contact.address, this.pageSize);
        this.messages = msgs;
        this.oldestLoadedDateMs = msgs?.length ? (msgs[0].date?.getTime?.() ?? Number(msgs[0].timestamp) ?? null) : null;
        const total = Number(contact.messageCount ?? 0);
        this.hasMoreMessages = total > (msgs?.length ?? 0);

        // Show newest messages immediately.
        const el = this.scrollContainerEl;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }

    async loadOlderMessages(): Promise<void> {
        if (this.loadingOlder) {
            return;
        }
        const contact = this.selectedContact;
        if (!contact?.address || this.oldestLoadedDateMs === null) {
            return;
        }
		const el = this.scrollContainerEl;
		const prevScrollHeight = el ? el.scrollHeight : 0;
		const prevScrollTop = el ? el.scrollTop : 0;

        this.loadingOlder = true;
        try {
            const older = await this.smsStoreService.getOlderMessages(contact.address, this.oldestLoadedDateMs, this.pageSize);
            if (!older?.length) {
                this.hasMoreMessages = false;
                return;
            }
            this.messages = [...older, ...(this.messages ?? [])];
            this.oldestLoadedDateMs = older[0].date?.getTime?.() ?? Number(older[0].timestamp) ?? this.oldestLoadedDateMs;
            const total = Number(contact.messageCount ?? 0);
            this.hasMoreMessages = total > (this.messages?.length ?? 0);

			// Preserve viewport position when prepending.
			if (el) {
				requestAnimationFrame(() => {
					const newScrollHeight = el.scrollHeight;
					const delta = newScrollHeight - prevScrollHeight;
					el.scrollTop = prevScrollTop + delta;
				});
			}
        } finally {
            this.loadingOlder = false;
        }
    }

    ngOnDestroy() {
        this.loadingSubscription.unsubscribe();
        this.contactClickedSubscription.unsubscribe();
		this.detachScrollListener?.();
    }

    getAllMessages(): void {
        this.messages = new Array<Message>();
		this.smsStoreService.getAllMessages().then(messageMap => {
			this.messageMap = messageMap;
		});
    }

    showMessages(contactId: string): void {
        this.smsStoreService.getLatestMessages(contactId, this.pageSize).then((msgs) => {
            this.messages = msgs;
            this.oldestLoadedDateMs = msgs?.length ? (msgs[0].date?.getTime?.() ?? Number(msgs[0].timestamp) ?? null) : null;
			const el = this.scrollContainerEl;
			if (el) {
				requestAnimationFrame(() => {
					el.scrollTop = el.scrollHeight;
				});
			}
        });
    }

    openExportDialog(): void {
        this.showExportDialog = true;
    }

    closeExportDialog(): void {
        this.showExportDialog = false;
    }

    handleExport(options: ExportOptions): void {
        this.showExportDialog = false;
        
        if (options.scope === 'conversation') {
            this.exportConversation(options);
        } else {
            this.exportAllMessages(options);
        }
    }

    private exportConversation(options: ExportOptions): void {
        if (!this.selectedContact) {
            return;
        }

        const conversationId = this.selectedContact.address;
        const columns = this.getSelectedColumns(options.fields);
        const namePart = this.selectedContact.name || this.selectedContact.address || 'conversation';

		const run = async () => {
			const messages = await this.smsStoreService.getMessages(conversationId);
			if (!messages?.length) {
				return;
			}

			if (options.mmsMediaAsFiles) {
				const mediaFiles: Array<{ path: string; content: Uint8Array }> = [];
				const rows = messages.map((m, messageIndex) => {
					const extracted = this.csvExportService.extractInlineBase64MediaFromHtml(m.body, {
						conversationId,
						messageIndex,
						timestampMs: Number(m.timestamp)
					});
					extracted.files.forEach((f) => mediaFiles.push({ path: f.path, content: f.bytes }));
					return this.messageToRow(m, conversationId, extracted.html);
				});

				const csv = this.csvExportService.buildCsv(rows, columns);
				this.csvExportService.downloadZip(`sms-conversation-${namePart}`, [
					{ path: 'messages.csv', content: csv },
					...mediaFiles
				]);
				return;
			}

			const rows = messages.map((m) => this.messageToRow(m, conversationId));
			this.csvExportService.downloadCsv(`sms-conversation-${namePart}`, rows, columns);
		};

		void run();
    }

    private exportAllMessages(options: ExportOptions): void {
        const columns = this.getSelectedColumns(options.fields);

        const run = async () => {
            const contacts = await this.smsStoreService.getAllContacts();
            if (!contacts?.length) {
                return;
            }

            if (options.mmsMediaAsFiles) {
                const mediaFiles: Array<{ path: string; content: Uint8Array }> = [];
                const rows: Array<Record<string, any>> = [];
                for (const c of contacts) {
                    const conversationId = c.address;
                    const messages = await this.smsStoreService.getMessages(conversationId);
                    messages.forEach((m, messageIndex) => {
                        const extracted = this.csvExportService.extractInlineBase64MediaFromHtml(m.body, {
                            conversationId,
                            messageIndex,
                            timestampMs: Number(m.timestamp)
                        });
                        extracted.files.forEach((f) => mediaFiles.push({ path: f.path, content: f.bytes }));
                        rows.push(this.messageToRow(m, conversationId, extracted.html));
                    });
                }
                const csv = this.csvExportService.buildCsv(rows, columns);
                this.csvExportService.downloadZip('sms-all-messages', [
                    { path: 'messages.csv', content: csv },
                    ...mediaFiles
                ]);
                return;
            }

            const rows: Array<Record<string, any>> = [];
            for (const c of contacts) {
                const conversationId = c.address;
                const messages = await this.smsStoreService.getMessages(conversationId);
                messages.forEach((m) => rows.push(this.messageToRow(m, conversationId)));
            }
            this.csvExportService.downloadCsv('sms-all-messages', rows, columns);
        };

        void run();
    }

    private messageToRow(m: Message, conversationId: string, bodyHtmlOverride?: string): Record<string, any> {
        const timestampMs = Number(m.timestamp);
        const dateIso = (m.date ?? new Date(timestampMs)).toISOString();
        const direction = m.type === 2 || m.type === 4 ? 'sent' : m.type === 1 || m.type === 3 ? 'received' : '';
        const bodyHtml = bodyHtmlOverride ?? m.body;
        
        return {
            conversationId,
            contactName: m.contactName,
            direction,
            type: m.type,
            timestampMs,
            dateIso,
            bodyText: this.csvExportService.htmlToText(bodyHtml),
            bodyHtml
        };
    }

    private getSelectedColumns(fields: ExportOptions['fields']): string[] {
        const allColumns = [
            'conversationId',
            'contactName',
            'direction',
            'type',
            'timestampMs',
            'dateIso',
            'bodyText',
            'bodyHtml'
        ] as const;
        
        return allColumns.filter(col => fields[col as keyof ExportOptions['fields']]);
    }

    trackByMessage(_index: number, message: Message): string {
        // Some backups can contain duplicate timestamps; include a few fields for stability.
        return `${Number(message?.timestamp)}:${message?.type}:${message?.body?.length ?? 0}`;
    }

}
