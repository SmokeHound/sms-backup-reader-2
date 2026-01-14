import { Injectable } from '@angular/core';
import { Message } from './message';

@Injectable()
export class SmsLoaderService {
    messages: Message[];

    constructor() { }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error); // for demo purposes only
        return Promise.reject(error.message || error);
    }

    //55296 >= X <= 57343
    //D800 - DFFF
    private cleanString(str: string): string {
        return str.replace(/&#(\d+);&#(\d+);/g, (match: string, unit1: string, unit2: string) => {
            let unitA: number = parseInt(unit1);
            let unitB: number = parseInt(unit2);
            if (unitA >= 55296 && unitA <= 57343) {
                return String.fromCodePoint(unitA, unitB);
            } else {
                return match;
            }
        });
    }

    getLoadedMessages(): Promise<Message[]> {
        return new Promise<Message[]>((resolve, reject) => {
            resolve(this.messages);
        }).catch(this.handleError);
    }

    private decodeHtml(str: string): string {
        var txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }

    private getElementsByLocalName(doc: any, localName: string): Element[] {
        const out = new Set<Element>();
        const addAll = (list: any) => {
            if (!list || typeof list.length !== 'number') {
                return;
            }
            for (let i = 0; i < list.length; i++) {
                out.add(list[i]);
            }
        };

        // Exact tag name match (common case)
        addAll(doc.getElementsByTagName?.(localName));
        // Namespace-tolerant match (e.g. <ns:sms>)
        addAll(doc.getElementsByTagNameNS?.('*', localName));
        // Some exporters might use uppercase tags
        addAll(doc.getElementsByTagName?.(localName.toUpperCase()));
        addAll(doc.getElementsByTagNameNS?.('*', localName.toUpperCase()));

        return Array.from(out);
    }

    loadSMSFile(file: File): Promise<void> {
        this.messages = new Array<Message>();
        let reader: FileReader = new FileReader();
        let parser: any = new DOMParser();
        let xmlDoc: any;

        reader.readAsText(file, 'UTF-8');

        return new Promise<void>((resolve, reject) => {
            reader.onload = (event: any) => { // Shouldn't need 'any' but this fixes an issue with TS definitions
            var cleanedText = this.cleanString(event.target.result);
            xmlDoc = parser.parseFromString(cleanedText, 'text/xml');

			// Detect parse errors (browser-dependent, but widely supported).
			if (xmlDoc.getElementsByTagName('parsererror')?.length) {
				reject(new Error('Invalid XML file. Expected an SMS Backup & Restore XML backup.'));
				return;
			}

            const smsNodes = this.getElementsByLocalName(xmlDoc, 'sms');
            const mmsNodes = this.getElementsByLocalName(xmlDoc, 'mms');
            if (smsNodes.length === 0 && mmsNodes.length === 0) {
                const rootTag = xmlDoc?.documentElement?.tagName ?? '(unknown root)';
                reject(new Error(`No <sms> or <mms> entries found in XML (root: <${rootTag}>). Is this the correct SMS Backup & Restore XML?`));
				return;
			}

            for (let sms of smsNodes) {
                this.messages.push({
                    //contactNumber: sms.getAttribute('address'),
                    contactAddress: sms.getAttribute('address'),
                    contactName: sms.getAttribute('contact_name'),
                    type: parseInt(sms.getAttribute('type')),
                    timestamp: sms.getAttribute('date'),
                    date: new Date(parseInt(sms.getAttribute('date'))),
                    body: sms.getAttribute('body')
                });
            }
            for (let mms of mmsNodes) {				
				let contactAddress:string = "";
				let body:string ="";
				let type:number = 3;
                for (let addr of this.getElementsByLocalName(mms, 'addr')) {
					if ((addr.getAttribute('type') == "137") || 
					    (contactAddress == 'insert-address-token'))
					{
						contactAddress = addr.getAttribute('address');
					}
					if (contactAddress == 	'insert-address-token')
					{
						type = 4;
					}
				}
                for (let part of this.getElementsByLocalName(mms, 'part')) {
					if (part.getAttribute('ct') == "image/jpeg")
					{
						body = body + '<img style="vertical-align:top" src="data:image/jpeg;base64,' +  (part.getAttribute('data') ?? '') + '"/>';
					}
					if (part.getAttribute('ct') == "text/plain")
					{
						body = body + '<div>' + (part.getAttribute('text') ?? '') + '</div>';
					}
				}
                this.messages.push({
                    contactAddress: contactAddress,
                    contactName: mms.getAttribute('contact_name'),
                    type: type,
                    timestamp: mms.getAttribute('date'),
                    date: new Date(parseInt(mms.getAttribute('date'))),
                    body: body
                });
            }
            resolve();
        }

		reader.onerror = (e) => reject(e);

 
    }).catch(this.handleError);
    }

}
