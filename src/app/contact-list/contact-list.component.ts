import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { Message } from '../message';
import { Contact } from '../contact';
import { SmsStoreService }  from '../sms-store.service';
import { CsvExportService } from '../csv-export.service';

@Component({
    selector: 'contact-list',
    templateUrl: './contact-list.component.html',
    styleUrls: ['./contact-list.component.css'],
    standalone: false
})

export class ContactListComponent implements OnInit {

	messagesLoaded: boolean;
    loadingSubscription: Subscription;
    contacts: Contact[];
    selectedContact: Contact;
    numfilter: string


    constructor(
		private smsStoreService: SmsStoreService,
		private csvExportService: CsvExportService
	) { }

    ngOnInit() {
        this.numfilter = '';
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
        .subscribe(messagesLoaded => {
            this.messagesLoaded = messagesLoaded;
            this.getAllContacts();
            return;
        });
    }

    getAllContacts() {
        this.smsStoreService.getAllContacts().then((contacts) => this.contacts = contacts);
    }

    showMessages(contact) {
        this.selectedContact = contact;
        this.smsStoreService.broadcastContactClicked(contact);
    }

	isSelected(contact) {
        return(this.selectedContact == contact);
    }
    
    exportAllMessages(): void {
        if (!this.messagesLoaded) {
            return;
        }

        this.smsStoreService.getAllMessages().then(messageMap => {
            const allMessages: Message[] = [];
            
            // Flatten all messages from all contacts
            for (const messages of messageMap.values()) {
                allMessages.push(...messages);
            }
            
            // Sort by timestamp
            allMessages.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
            
            const rows = allMessages.map((m) => {
                const timestampMs = Number(m.timestamp);
                const dateIso = (m.date ?? new Date(timestampMs)).toISOString();
                const direction = m.type === 2 || m.type === 4 ? 'sent' : m.type === 1 || m.type === 3 ? 'received' : '';
                return {
                    contactAddress: m.contactAddress,
                    contactName: m.contactName,
                    direction,
                    type: m.type,
                    timestampMs,
                    dateIso,
                    bodyText: this.csvExportService.htmlToText(m.body),
                    bodyHtml: m.body
                };
            });

            this.csvExportService.downloadCsv('sms-all-messages', rows, [
                'contactAddress',
                'contactName',
                'direction',
                'type',
                'timestampMs',
                'dateIso',
                'bodyText',
                'bodyHtml'
            ]);
        });
    }
    
    ngOnDestroy() {
        // prevent memory leak when component is destroyed
        this.loadingSubscription.unsubscribe();
    }

}
