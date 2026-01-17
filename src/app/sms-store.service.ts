import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Message } from './message';
import { Contact } from './contact';
import { SmsDbService } from './sms-db.service';

import awesomePhone from 'awesome-phonenumber';

@Injectable()
export class SmsStoreService {

    messages: Message[];
    contacts: Contact[];
    messageMap: Map<string, Message[]>;
    countryCode: string;
    messagesLoaded: boolean;
    private useIndexedDb: boolean;
    private ingestChain: Promise<void>;

    constructor(private smsDbService: SmsDbService) { 
        this.messagesLoaded = false;
        this.countryCode = 'US';
        this.useIndexedDb = false;
        this.ingestChain = Promise.resolve();
    }

    beginIngest(options?: { persistToIndexedDb?: boolean; clearIndexedDb?: boolean }): void {
        const persistToIndexedDb = options?.persistToIndexedDb === true;
        this.useIndexedDb = persistToIndexedDb;

        // Always clear in-memory state.
        this.messages = [];
        this.messageMap = new Map();
        this.contacts = [];
        this.messagesLoaded = false;

		this.ingestChain = Promise.resolve();

        if (persistToIndexedDb && options?.clearIndexedDb !== false) {
            // Ensure clear happens before the first batch write.
            this.ingestChain = this.smsDbService.clearAll().then(() => undefined);
        }
    }

    ingestMessagesBatch(messages: Message[]): void {
        if (!messages?.length) {
            return;
        }

        if (this.useIndexedDb) {
            const batch = messages.map((message) => {
                const threadId = this.normalizeContactAddress(message.contactAddress);
                const dateMs = message.date?.getTime?.() ?? Number(message.timestamp) ?? 0;
                return {
                    threadId,
                    message: {
                        timestamp: message.timestamp,
                        type: message.type,
                        contactName: message.contactName ?? null,
                        body: message.body,
                        dateMs
                    }
                };
            });
			this.ingestChain = this.ingestChain
				.then(() => this.smsDbService.ingestBatch(batch))
				.catch((e) => {
					console.error('IndexedDB ingest failed', e);
				});
            return;
        }

        if (!this.messages) {
            this.messages = [];
        }
        if (!this.messageMap) {
            this.messageMap = new Map();
        }
        for (const message of messages) {
            this.messages.push(message);
            const contactAddress = this.normalizeContactAddress(message.contactAddress);
            let mapEntry = this.messageMap.get(contactAddress);
            if (!mapEntry) {
                mapEntry = [];
                this.messageMap.set(contactAddress, mapEntry);
            }
            mapEntry.push(message);
        }
    }

    private normalizeContactAddress(raw: string): string {
        let phone = new awesomePhone(raw, this.countryCode);
        let contactAddress: string = phone.getNumber('international');
        if (!contactAddress) {
            contactAddress = raw;
        }
        return contactAddress;
    }

    finishIngest(): void {
        if (this.useIndexedDb) {
            // Legacy sync API: prefer finishIngestAsync() in DB mode.
            this.messagesLoaded = true;
            return;
        }
        if (!this.messageMap) {
            this.messageMap = new Map();
        }
        this.messageMap.forEach((value: Message[], key: string) => {
            value = value.sort((message1, message2) => message1.date.getTime() - message2.date.getTime());
            this.messageMap.set(key, value);
        });

        this.contacts = [];
        this.messageMap.forEach((value: Message[], key: string) => {
            let contactName = value[0]?.contactName;
            this.contacts.push({
                name: (contactName != '(Unknown)') ? contactName : null,
                address: key as string,
                messageCount: value.length
            });
        });

        this.messagesLoaded = true;
    }

    async finishIngestAsync(): Promise<void> {
        if (this.useIndexedDb) {
            await this.ingestChain;
            this.messagesLoaded = true;
            return;
        }
        this.finishIngest();
    }

    isUsingIndexedDb(): boolean {
        return this.useIndexedDb;
    }

    areMessagesLoaded(): Promise<boolean> {
        return Promise.resolve(this.messagesLoaded);
    }

    changeCountry(countryCode: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
			if (this.countryCode != countryCode)
			{
				this.countryCode = countryCode;
                if (this.useIndexedDb && this.messagesLoaded) {
                    // Re-grouping DB-backed conversations would require re-writing threadIds.
                    // Keep it simple: country affects formatting; for persisted data, re-import is recommended.
                    this.broadcastMessagesLoaded(true);
                    resolve();
                    return;
                }
                if (this.messagesLoaded) {
					this.loadAllMessages(this.messages).then(() => {
						this.broadcastMessagesLoaded(true);
						resolve();
					});
				} else {
					resolve();
				}
			} else {
				resolve();
			}
        });
    }

    getCountry(): Promise<string> {
        return new Promise((resolve, reject) => {
            resolve(this.countryCode);
        });
    }

    //http://stackoverflow.com/questions/34376854/delegation-eventemitter-or-observable-in-angular2/35568924#35568924
    // Observable source
    private _messagesLoadedSource = new BehaviorSubject<boolean>(false);
    // Observable stream
    messagesLoaded$ = this._messagesLoadedSource.asObservable();
    // Service command
    broadcastMessagesLoaded(messagesLoaded: boolean) {
        this._messagesLoadedSource.next(messagesLoaded);
    }

    // Observable source
    private _contactClickedSource = new BehaviorSubject<Contact>(null);
    // Observable stream
    contactClicked$ = this._contactClickedSource.asObservable();
    // Service command
    broadcastContactClicked(contactClicked: Contact) {
        this._contactClickedSource.next(contactClicked);
    }


    loadAllMessages(messages: Message[]): Promise<void> {
		this.messages = messages;
        this.messageMap = new Map();
        this.contacts = new Array<Contact>();
        return new Promise((resolve, reject) => {
            this.messages = messages;
            
            // Process messages in chunks to avoid freezing UI
            const CHUNK_SIZE = 500;
            let index = 0;
            
            const processChunk = () => {
                const endIndex = Math.min(index + CHUNK_SIZE, messages.length);
                
                for (let i = index; i < endIndex; i++) {
                    let message = messages[i];
                    let mapEntry;
                    let phone = new awesomePhone(message.contactAddress, this.countryCode);
                    let contactAddress: string = phone.getNumber('international');  
                    if (!contactAddress) {
                        contactAddress = message.contactAddress;
                    }
                    
                    if(!(mapEntry = this.messageMap.get(contactAddress))) {
                        mapEntry = new Array<Message>();
                        mapEntry.push(message);
                        this.messageMap.set(contactAddress, mapEntry);
                    } else {
                        mapEntry.push(message);
                    }
                }
                
                index = endIndex;
                
                if (index < messages.length) {
                    // More messages to process, schedule next chunk
                    setTimeout(processChunk, 0);
                } else {
                    // All messages processed, now sort and create contacts
                    this.messageMap.forEach(( value: Message[], key: string) => {
                        value = value.sort((message1, message2) => message1.date.getTime() - message2.date.getTime());
                        this.messageMap.set(key, value);
                    });
                    
                    this.messageMap.forEach((value: Message[], key: string) => {
                        let contactName = value[0].contactName;
                        this.contacts.push({
                            name: (contactName != '(Unknown)') ? contactName : null,
                            address: key as string,
                            messageCount: value.length
                        });
                    });

                    this.messagesLoaded = true;
                    resolve();
                }
            };
            
            processChunk();
        });
    }

    clearAllMessages(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.messageMap = new Map();
            this.messages = new Array<Message>();
            this.messagesLoaded = false;
            resolve();
        });
    }

    // Get all messages for all contacts
    getAllMessages(): Promise<Map<string, Message[]>> {
        return new Promise((resolve, reject) => {
			// Not supported in DB mode without loading everything into memory.
			resolve(this.messageMap);
        });
    }

	// Get the raw loaded messages (flat list)
	getRawMessages(): Promise<Message[]> {
		return Promise.resolve(this.messages ?? []);
	}

    // this.contacts = [...messageMap.keys()]; // need to target ES6 for this to work
    getAllContacts(): Promise<Contact[]> {
        if (!this.useIndexedDb) {
            return new Promise((resolve, reject) => {
                resolve(this.contacts);
            });
        }
        return this.smsDbService.getThreads().then((threads) => {
            return threads.map((t) => {
                return {
                    name: t.contactName,
                    address: t.threadId,
                    messageCount: t.messageCount
                } as Contact;
            });
        });
    }

    // Get the messages for a specific contact
    getMessages(contactId: string): Promise<Message[]> {
        if (!this.useIndexedDb) {
            let returnMessages: Message[];
            return new Promise((resolve, reject) => {
                returnMessages = this.messageMap.get(contactId);
                resolve(returnMessages);
            });
        }
        return this.smsDbService.getMessagesForThread(contactId).then((rows) => {
            return rows.map((r) => {
                return {
                    contactAddress: contactId,
                    contactName: (r.contactName ?? null) as any,
                    timestamp: r.timestamp,
                    type: r.type,
                    body: r.body,
                    date: new Date(r.dateMs)
                } as any;
            });
        });
    }
	
	fillContactNames(contactMap: Map<string, string>): Promise<void> {
		return new Promise((resolve, reject) => {
            if (this.useIndexedDb) {
                void this.smsDbService.updateThreadNames(contactMap);
                resolve();
                return;
            }
            this.contacts.forEach(function(contact)
            {
                let name: string;
                name = contactMap.get(contact.address);
                if (name)
                {
                    contact.name = name;
                }
            });
			resolve();
		});
	}

    async clearIndexedDb(): Promise<void> {
        await this.smsDbService.clearAll();
    }
}



