import { Component, OnInit } from '@angular/core';
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

export class MessageListComponent implements OnInit {

    messages: Message[];
    messageMap: Map<string, Message[]>;

    messagesLoaded: boolean;
    loadingSubscription: Subscription;
    contactClickedSubscription: Subscription;
    selectedContact: Contact;
    
    showExportDialog = false;

        constructor(
		private smsStoreService: SmsStoreService,
		private csvExportService: CsvExportService
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
                this.messages = this.messageMap.get(contact.address);
            }
            return;
        });
    }

    ngOnDestroy() {
        this.loadingSubscription.unsubscribe();
        this.contactClickedSubscription.unsubscribe();
    }

    getAllMessages(): void {
        this.messages = new Array<Message>();
        this.smsStoreService.getAllMessages().then(messageMap => {
            this.messageMap = messageMap;
        });
    }

    showMessages(contactId: string): void {
        this.messages = this.messageMap.get(contactId);
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
        if (!this.selectedContact || !this.messages?.length) {
            return;
        }

        const conversationId = this.selectedContact.address;
        const columns = this.getSelectedColumns(options.fields);
        const namePart = this.selectedContact.name || this.selectedContact.address || 'conversation';

        if (options.mmsMediaAsFiles) {
            const mediaFiles: Array<{ path: string; content: Uint8Array }> = [];
            const rows = this.messages.map((m, messageIndex) => {
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

        const rows = this.messages.map((m) => this.messageToRow(m, conversationId));
        this.csvExportService.downloadCsv(`sms-conversation-${namePart}`, rows, columns);
    }

    private exportAllMessages(options: ExportOptions): void {
        if (!this.messageMap?.size) {
            return;
        }

        const columns = this.getSelectedColumns(options.fields);

        if (options.mmsMediaAsFiles) {
            const mediaFiles: Array<{ path: string; content: Uint8Array }> = [];
            const rows: Array<Record<string, any>> = [];
            this.messageMap.forEach((messages, conversationId) => {
                messages.forEach((m, messageIndex) => {
                    const extracted = this.csvExportService.extractInlineBase64MediaFromHtml(m.body, {
                        conversationId,
                        messageIndex,
                        timestampMs: Number(m.timestamp)
                    });
                    extracted.files.forEach((f) => mediaFiles.push({ path: f.path, content: f.bytes }));
                    rows.push(this.messageToRow(m, conversationId, extracted.html));
                });
            });

            const csv = this.csvExportService.buildCsv(rows, columns);
            this.csvExportService.downloadZip('sms-all-messages', [
                { path: 'messages.csv', content: csv },
                ...mediaFiles
            ]);
            return;
        }

        const rows: Array<Record<string, any>> = [];
        this.messageMap.forEach((messages, conversationId) => {
            messages.forEach((m) => {
                rows.push(this.messageToRow(m, conversationId));
            });
        });
        this.csvExportService.downloadCsv('sms-all-messages', rows, columns);
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

}
