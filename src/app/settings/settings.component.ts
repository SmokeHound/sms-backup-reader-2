import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { CsvExportService } from '../csv-export.service';
import { SmsStoreService } from '../sms-store.service';
import { Message } from '../message';
import { Contact } from '../contact';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css'],
    standalone: false
})
export class SettingsComponent implements OnInit {
    messagesLoaded: boolean = false;
    private loadingSubscription: Subscription;

    constructor(
        private smsStoreService: SmsStoreService,
        private csvExportService: CsvExportService
    ) { }

    ngOnInit() {
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
            .subscribe((loaded) => (this.messagesLoaded = loaded));
    }

    ngOnDestroy() {
        this.loadingSubscription?.unsubscribe();
    }

    async exportAllMessages(): Promise<void> {
        const messageMap = await this.smsStoreService.getAllMessages();
        const rows = Array.from(messageMap.entries()).flatMap(([conversationId, messages]) =>
            messages.map((m) => {
                const timestampMs = Number(m.timestamp);
                const dateIso = (m.date ?? new Date(timestampMs)).toISOString();
                const direction = m.type === 2 || m.type === 4 ? 'sent' : m.type === 1 || m.type === 3 ? 'received' : '';
                return {
                    conversationId,
                    contactName: m.contactName,
                    direction,
                    type: m.type,
                    timestampMs,
                    dateIso,
                    bodyText: this.csvExportService.htmlToText(m.body),
                    bodyHtml: m.body
                };
            })
        );

        this.csvExportService.downloadCsv('sms-backup-messages', rows, [
            'conversationId',
            'contactName',
            'direction',
            'type',
            'timestampMs',
            'dateIso',
            'bodyText',
            'bodyHtml'
        ]);
    }

    async exportContacts(): Promise<void> {
        const contacts: Contact[] = await this.smsStoreService.getAllContacts();
        const rows = contacts.map((c) => ({
            name: c.name,
            address: c.address,
            messageCount: c.messageCount
        }));

        this.csvExportService.downloadCsv('sms-backup-contacts', rows, [
            'name',
            'address',
            'messageCount'
        ]);
    }

}
