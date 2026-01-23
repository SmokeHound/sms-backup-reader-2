import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LogEntry, LogLevel, LogService } from '../log.service';

@Component({
	selector: 'app-log',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './log.component.html',
	styleUrls: ['./log.component.css']
})
export class LogComponent implements OnInit, OnDestroy {
	entries: LogEntry[] = [];
	filtered: LogEntry[] = [];
	query = '';
	level: LogLevel | 'all' = 'all';

	private sub?: Subscription;

	constructor(private logs: LogService, private router: Router) {}

	ngOnInit(): void {
		this.sub = this.logs.entries$.subscribe((entries) => {
			this.entries = entries;
			this.applyFilter();
		});
	}

	ngOnDestroy(): void {
		this.sub?.unsubscribe();
	}

	goMain(): void {
		void this.router.navigateByUrl('/main');
	}

	clear(): void {
		this.logs.clear();
	}

	applyFilter(): void {
		const q = (this.query || '').trim().toLowerCase();
		const lvl = this.level;

		this.filtered = (this.entries ?? []).filter((e) => {
			if (lvl !== 'all' && e.level !== lvl) return false;
			if (!q) return true;
			const hay = `${e.level} ${e.message} ${safeString(e.details)}`.toLowerCase();
			return hay.includes(q);
		});
	}

	formatTime(ms: number): string {
		const d = new Date(ms);
		try {
			return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(d);
		} catch {
			return d.toLocaleString();
		}
	}

	async copy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(this.logs.toText(this.filtered));
		} catch {
			// ignore
		}
	}
}

function safeString(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value ?? '');
	}
}
