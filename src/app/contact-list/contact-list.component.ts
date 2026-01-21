import { Component, OnInit, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';

import { Message } from '../message';
import { Contact } from '../contact';
import { SmsStoreService }  from '../sms-store.service';

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


    constructor(private smsStoreService: SmsStoreService, private ngZone: NgZone) { }

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
        this.smsStoreService.getAllContacts().then((contacts) => {
            // Dexie/IndexedDB promises can resolve outside Angular's zone.
            this.ngZone.run(() => {
                this.contacts = contacts;
            });
        });
    }

    showMessages(contact) {
        this.selectedContact = contact;
        this.smsStoreService.broadcastContactClicked(contact);
    }

	trackByContact(_index: number, contact: Contact): string {
		return contact?.address;
	}

	isSelected(contact) {
        return(this.selectedContact == contact);
    }
    ngOnDestroy() {
        // prevent memory leak when component is destroyed
        this.loadingSubscription.unsubscribe();
    }

}
