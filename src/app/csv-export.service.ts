import { Injectable } from '@angular/core';
import { CsvCell, rowsToCsv } from './csv';
import { ToastService } from './toast.service';

@Injectable({
	providedIn: 'root'
})
export class CsvExportService {
	constructor(private toastService: ToastService) {}

	private sanitizeFilename(name: string): string {
		// Keep it Windows-friendly and avoid weird path characters.
		return name.replace(/[\\/:*?"<>|]+/g, '_').trim();
	}

	private decodeBase64ToBytes(base64: string): Uint8Array {
		// Browser: atob. Tests (node/jsdom): Buffer fallback.
		if (typeof atob === 'function') {
			const binary = atob(base64);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			return bytes;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buf = (globalThis as any)?.Buffer?.from?.(base64, 'base64');
		return buf ? new Uint8Array(buf) : new Uint8Array();
	}

	private mimeToExtension(mime: string): string {
		const m = (mime || '').toLowerCase();
		if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
		if (m === 'image/png') return 'png';
		if (m === 'image/gif') return 'gif';
		if (m === 'image/webp') return 'webp';
		if (m === 'video/mp4') return 'mp4';
		if (m === 'audio/mpeg') return 'mp3';
		if (m === 'audio/mp4') return 'm4a';
		return 'bin';
	}

	extractInlineBase64MediaFromHtml(
		html: string,
		options: {
			conversationId: string;
			messageIndex: number;
			timestampMs?: number;
			baseDir?: string;
		}
	): { html: string; files: Array<{ path: string; bytes: Uint8Array; mime: string }> } {
		if (!html) {
			return { html: '', files: [] };
		}

		const baseDir = (options.baseDir ?? 'media').replace(/\\/g, '/').replace(/\/+$/g, '');
		const safeConversation = this.sanitizeFilename(options.conversationId || 'conversation');
		const timestampPart = Number.isFinite(options.timestampMs) ? String(options.timestampMs) : 'no-ts';
		const dir = `${baseDir}/${safeConversation}`;

		const files: Array<{ path: string; bytes: Uint8Array; mime: string }> = [];

		// DOM-based parsing is more reliable than regex for HTML.
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const images = Array.from(doc.querySelectorAll('img'));

		let imageIndex = 0;
		for (const img of images) {
			const src = img.getAttribute('src') ?? '';
			if (!src.startsWith('data:')) {
				continue;
			}

			const base64Marker = ';base64,';
			const markerIndex = src.indexOf(base64Marker);
			if (markerIndex === -1) {
				continue;
			}

			const mime = src.slice('data:'.length, markerIndex).split(';')[0].trim();
			const base64 = src.slice(markerIndex + base64Marker.length);
			const bytes = this.decodeBase64ToBytes(base64);
			const ext = this.mimeToExtension(mime);

			const filename = `${timestampPart}-${options.messageIndex}-${imageIndex}.${ext}`;
			const relPath = `${dir}/${filename}`;

			files.push({ path: relPath, bytes, mime });
			img.setAttribute('src', relPath);
			imageIndex++;
		}

		return { html: doc.body.innerHTML, files };
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

	async downloadCsv(
		filenameBase: string,
		rows: Array<Record<string, CsvCell>>,
		columns: string[]
	): Promise<void> {
		const filename = this.sanitizeFilename(filenameBase || 'export') + '.csv';

		// Add BOM for better Excel UTF-8 handling.
		const csv = '\ufeff' + rowsToCsv(rows, columns);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

		// Try Tauri-native save first when available.
		if (this.isTauriRuntime()) {
			try {
				const savedPath = await this.tryTauriSaveBlob(filename, blob);
				if (savedPath) {
					// Show toast with action to open the folder
					const dir = (savedPath || '').replace(/[/\\][^/\\]+$/, '');
					this.toastService.showWithAction(
						`Saved to: ${savedPath}`,
						'Open folder',
						async () => {
							// Attempt to open the folder using Tauri shell if available.
							await this.openFolder(dir);
						},
						7000
					);
					return;
				}
			} catch (e) {
				console.warn('Tauri save failed, falling back to browser download', e);
			}
		}

		// Fallback: browser download
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

	async downloadZip(
		filenameBase: string,
		files: Array<{ path: string; content: string | Uint8Array }>
	): Promise<void> {
		const filename = this.sanitizeFilename(filenameBase || 'export') + '.zip';
		const JSZip = (await import('jszip')).default;
		const zip = new JSZip();

		for (const f of files) {
			const path = (f.path || '').replace(/\\/g, '/');
			zip.file(path, f.content as any);
		}

		const blob = await zip.generateAsync({ type: 'blob' });

		// Try Tauri-native save first when available.
		if (this.isTauriRuntime()) {
			try {
				const savedPath = await this.tryTauriSaveBlob(filename, blob);
				if (savedPath) {
					const dir = (savedPath || '').replace(/[/\\][^/\\]+$/, '');
					this.toastService.showWithAction(
						`Saved to: ${savedPath}`,
						'Open folder',
						async () => {
							// Attempt to open the folder using Tauri shell if available.
							await this.openFolder(dir);
						},
						7000
					);
					return;
				}
			} catch (e) {
				console.warn('Tauri save failed, falling back to browser download', e);
			}
		}

		// Fallback: browser download
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

	private async openFolder(dir: string): Promise<void> {
		try {
			// Assemble import path at runtime so Vite does not try to resolve it for browser builds.
			const shellPath = '@tauri-apps/api/' + 'shell';
			const { open } = await import(/* @vite-ignore */ shellPath) as any;
			await open(dir);
		} catch (e) {
			// non-fatal; caller will handle user-visible messages.
			console.warn('Failed to open folder', e);
		}
	}

	private isTauriRuntime(): boolean {
		try {
			const protocol = (window?.location?.protocol ?? '').toLowerCase();
			if (protocol === 'tauri:' || protocol === 'asset:') return true;
			const host = (window?.location?.hostname ?? '').toLowerCase();
			if (host === 'tauri.localhost' || host.endsWith('.tauri.localhost')) return true;
			const w = window as any;
			if (typeof w?.__TAURI__ !== 'undefined' || typeof w?.__TAURI_INTERNALS__ !== 'undefined') return true;
			return (navigator?.userAgent ?? '').toLowerCase().includes('tauri');
		} catch {
			return false;
		}
	}

	private async tryTauriSaveBlob(filename: string, blob: Blob): Promise<string | null> {
		try {
			const { save } = await import('@tauri-apps/api/dialog');
			const path = await save({ defaultPath: filename });
			if (!path) return null;

			const arrayBuffer = await blob.arrayBuffer();
			const uint8 = new Uint8Array(arrayBuffer);
			const { writeBinaryFile } = await import('@tauri-apps/api/fs');
			await writeBinaryFile({ path, contents: uint8 });
			return path;
		} catch (e) {
			console.error('Tauri save error', e);
			return null;
		}
	}

	buildCsv(rows: Array<Record<string, CsvCell>>, columns: string[]): string {
		// Add BOM for better Excel UTF-8 handling.
		return '\ufeff' + rowsToCsv(rows, columns);
	}
}
