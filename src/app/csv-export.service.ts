import { Injectable } from '@angular/core';
import { CsvCell, rowsToCsv } from './csv';

@Injectable({
	providedIn: 'root'
})
export class CsvExportService {
	private sanitizeFilename(name: string): string {
		// Keep it Windows-friendly and avoid weird path characters.
		return name.replace(/[\\/:*?"<>|]+/g, '_').trim();
	}

	htmlToText(html: string): string {
		if (!html) {
			return '';
		}

		// Preserve something meaningful for embedded images and basic line breaks.
		let text = html
			.replace(/<img\b[^>]*>/gi, '[image]')
			.replace(/<(br\s*\/?>)/gi, '\n')
			.replace(/<\/(div|p)>/gi, '\n');

		// Strip any remaining tags.
		text = text.replace(/<[^>]*>/g, '');

		// Normalize whitespace/newlines for CSV consumption.
		text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		text = text.replace(/\n{3,}/g, '\n\n');
		return text.trim();
	}

	downloadCsv(
		filenameBase: string,
		rows: Array<Record<string, CsvCell>>,
		columns: string[]
	): void {
		const filename = this.sanitizeFilename(filenameBase || 'export') + '.csv';

		// Add BOM for better Excel UTF-8 handling.
		const csv = '\ufeff' + rowsToCsv(rows, columns);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.style.display = 'none';
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}
}
