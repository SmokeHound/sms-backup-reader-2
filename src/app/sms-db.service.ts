import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export type DbMessage = {
  id?: number;
  threadId: string;
  dateMs: number;
  timestamp: string;
  type: number;
  contactName: string | null;
  body: string;
};

export type DbThread = {
  threadId: string;
  contactName: string | null;
  messageCount: number;
  lastDateMs: number;
};

class SmsBackupViewerDb extends Dexie {
  messages!: Table<DbMessage, number>;
  threads!: Table<DbThread, string>;

  constructor() {
    super('sms-backup-viewer');

    // Version 1 schema
    this.version(1).stores({
      // ++id for efficient inserts; compound index supports fetching a conversation in order.
      messages: '++id, threadId, dateMs, [threadId+dateMs]',
      // threadId is the normalized contact address.
      threads: 'threadId, lastDateMs'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class SmsDbService {
  private db = new SmsBackupViewerDb();

  async getStats(): Promise<{ threadCount: number; messageCount: number }> {
    const [threadCount, messageCount] = await Promise.all([
      this.db.threads.count(),
      this.db.messages.count()
    ]);
    return { threadCount, messageCount };
  }

  async clearAll(): Promise<void> {
    await this.db.transaction('rw', this.db.messages, this.db.threads, async () => {
      await this.db.messages.clear();
      await this.db.threads.clear();
    });
  }

  async ingestBatch(items: Array<{ threadId: string; message: { timestamp: string; type: number; contactName: string | null; body: string; dateMs: number } }>): Promise<void> {
    if (!items?.length) {
      return;
    }

    const messages: DbMessage[] = [];
    const threadAgg = new Map<string, { messageCount: number; lastDateMs: number; contactName: string | null }>();

    for (const item of items) {
      const { threadId, message } = item;
      messages.push({
        threadId,
        timestamp: message.timestamp,
        type: message.type,
        contactName: message.contactName ?? null,
        body: message.body,
        dateMs: message.dateMs
      });

      const existing = threadAgg.get(threadId);
      if (!existing) {
        threadAgg.set(threadId, {
          messageCount: 1,
          lastDateMs: message.dateMs,
          contactName: message.contactName ?? null
        });
      } else {
        existing.messageCount += 1;
        existing.lastDateMs = Math.max(existing.lastDateMs, message.dateMs);
        if (!existing.contactName && message.contactName) {
          existing.contactName = message.contactName;
        }
      }
    }

    await this.db.transaction('rw', this.db.messages, this.db.threads, async () => {
      await this.db.messages.bulkAdd(messages);

      const threadIds = Array.from(threadAgg.keys());
      const existingThreads = await this.db.threads.bulkGet(threadIds);

      const upserts: DbThread[] = [];
      for (let i = 0; i < threadIds.length; i++) {
        const threadId = threadIds[i];
        const agg = threadAgg.get(threadId)!;
        const existing = existingThreads[i];

        if (!existing) {
          upserts.push({
            threadId,
            contactName: agg.contactName,
            messageCount: agg.messageCount,
            lastDateMs: agg.lastDateMs
          });
        } else {
          upserts.push({
            threadId,
            contactName: existing.contactName ?? agg.contactName,
            messageCount: (existing.messageCount ?? 0) + agg.messageCount,
            lastDateMs: Math.max(existing.lastDateMs ?? 0, agg.lastDateMs)
          });
        }
      }

      await this.db.threads.bulkPut(upserts);
    });
  }

  async getThreads(): Promise<DbThread[]> {
    return this.db.threads.orderBy('lastDateMs').reverse().toArray();
  }

  async getMessagesForThread(threadId: string): Promise<DbMessage[]> {
    return this.db.messages.where('[threadId+dateMs]').between([threadId, Dexie.minKey], [threadId, Dexie.maxKey]).toArray();
  }

  async updateThreadNames(nameByThreadId: Map<string, string>): Promise<void> {
    const entries = Array.from(nameByThreadId.entries()).filter(([_, name]) => !!name);
    if (!entries.length) {
      return;
    }

    await this.db.transaction('rw', this.db.threads, async () => {
      for (const [threadId, name] of entries) {
        await this.db.threads.update(threadId, { contactName: name });
      }
    });
  }

  async hasAnyData(): Promise<boolean> {
    const count = await this.db.threads.count();
    return count > 0;
  }
}
