import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
	id: number;
	at: number;
	level: LogLevel;
	message: string;
	details?: unknown;
};

@Injectable({
	providedIn: 'root'
})
export class LogService {
	private readonly maxEntries = 500;
	private nextId = 1;
	private readonly _entries = new BehaviorSubject<LogEntry[]>([]);
	readonly entries$ = this._entries.asObservable();

	constructor(private ngZone: NgZone) {}

	clear(): void {
		this.ngZone.run(() => {
			this._entries.next([]);
		});
	}

	debug(message: string, details?: unknown): void {
		this.add('debug', message, details);
	}

	info(message: string, details?: unknown): void {
		this.add('info', message, details);
	}

	warn(message: string, details?: unknown): void {
		this.add('warn', message, details);
	}

	error(message: string, details?: unknown): void {
		this.add('error', message, details);
	}

	add(level: LogLevel, message: string, details?: unknown): void {
		const entry: LogEntry = {
			id: this.nextId++,
			at: Date.now(),
			level,
			message: String(message ?? ''),
			details
		};

		this.ngZone.run(() => {
			const current = this._entries.value;
			const next = [...current, entry];
			if (next.length > this.maxEntries) {
				next.splice(0, next.length - this.maxEntries);
			}
			this._entries.next(next);
		});
	}

	toText(entries?: LogEntry[]): string {
		const list = entries ?? this._entries.value;
		return list
			.map((e) => {
				const ts = new Date(e.at).toISOString();
				const details = typeof e.details === 'undefined' ? '' : `\n  details: ${safeJson(e.details)}`;
				return `[${ts}] ${e.level.toUpperCase()} ${e.message}${details}`;
			})
			.join('\n');
	}
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
