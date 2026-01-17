import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { CsvExportService } from '../csv-export.service';
import { SmsStoreService } from '../sms-store.service';
import { Message } from '../message';
import { Contact } from '../contact';
import { SmsDbService } from '../sms-db.service';
import { VcfStoreService } from '../vcf-store.service';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css'],
    standalone: false
})
export class SettingsComponent implements OnInit {
    messagesLoaded: boolean = false;
    private loadingSubscription: Subscription;
    indexedDbEnabled: boolean = true;
    dbThreadCount: number = 0;
    dbMessageCount: number = 0;
    clearingDb: boolean = false;

    constructor(
        private smsStoreService: SmsStoreService,
        private csvExportService: CsvExportService,
		private smsDbService: SmsDbService,
		private vcfStoreService: VcfStoreService
    ) { }

    ngOnInit() {
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
            .subscribe((loaded) => (this.messagesLoaded = loaded));
		this.indexedDbEnabled = this.smsStoreService.getIndexedDbEnabled();
		this.refreshDbStats();
    }

    ngOnDestroy() {
        this.loadingSubscription?.unsubscribe();
    }

    async refreshDbStats(): Promise<void> {
        try {
            const stats = await this.smsDbService.getStats();
            this.dbThreadCount = stats.threadCount;
            this.dbMessageCount = stats.messageCount;
        } catch {
            this.dbThreadCount = 0;
            this.dbMessageCount = 0;
        }
    }

    onIndexedDbEnabledChanged(): void {
        this.smsStoreService.setIndexedDbEnabled(this.indexedDbEnabled);
    }

    async clearIndexedDb(): Promise<void> {
        if (this.clearingDb) {
            return;
        }
        this.clearingDb = true;
        try {
            await this.smsStoreService.clearIndexedDb();
            // Also clear any in-memory state.
            await this.smsStoreService.clearAllMessages();
            this.smsStoreService.broadcastMessagesLoaded(false);
			await this.vcfStoreService.clearAllContacts();
			this.vcfStoreService.broadcastMessagesLoaded(false);
            await this.refreshDbStats();
        } finally {
            this.clearingDb = false;
        }
    }

    async exportAllMessages(): Promise<void> {
        const contacts = await this.smsStoreService.getAllContacts();
        const rows: Array<Record<string, any>> = [];
        for (const c of contacts) {
            const conversationId = c.address;
            const messages = await this.smsStoreService.getMessages(conversationId);
            messages.forEach((m) => {
                const timestampMs = Number(m.timestamp);
                const dateIso = (m.date ?? new Date(timestampMs)).toISOString();
                const direction = m.type === 2 || m.type === 4 ? 'sent' : m.type === 1 || m.type === 3 ? 'received' : '';
                rows.push({
                    conversationId,
                    contactName: m.contactName,
                    direction,
                    type: m.type,
                    timestampMs,
                    dateIso,
                    bodyText: this.csvExportService.htmlToText(m.body),
                    bodyHtml: m.body
                });
            });
        }

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
