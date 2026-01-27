import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CsvExportService } from '../csv-export.service';
import { LogService } from '../log.service';

@Component({
  selector: 'app-join-backups',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './join-backups.component.html',
  styleUrls: ['./join-backups.component.css']
})
export class JoinBackupsComponent {
  selectedFiles: Array<{ name: string; size: number; text?: string; path?: string; fileRef?: File; readError?: string; reading?: boolean; expanded?: boolean; details?: { messages: number; contacts: number; sample?: string; parseError?: string } }> = [];
  status = '';
  preview = { files: 0, messages: 0, contacts: 0 };

	private fastXml: { XMLParser: any; XMLBuilder: any } | null = null;
	private fastXmlLoad?: Promise<{ XMLParser: any; XMLBuilder: any } | null>;

  constructor(
  private csvExport: CsvExportService,
  private ngZone: NgZone,
  private router: Router,
  private logs: LogService
  ) {}

  goBackToMain(): void {
    void this.router.navigateByUrl('/main');
  }

  onBrowserFileInputChange(event: Event): void {
    const input = event?.target as HTMLInputElement | null;
    const files = input?.files ?? null;
    void this.addFilesBrowser(files);
    // allow selecting the same file(s) again
    if (input) {
      input.value = '';
    }
  }

  async addFilesBrowser(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
	this.logs.info('Join Backups: adding files (browser)', { count: arr.length });

  const newEntries = arr.map((f) => ({
    name: f.name,
    size: f.size,
    text: undefined as string | undefined,
    fileRef: f,
    readError: undefined as string | undefined,
    reading: true,
    expanded: false,
    details: undefined as any
  }));

  this.ngZone.run(() => {
    this.status = 'Reading files...';
    this.selectedFiles = [...(this.selectedFiles ?? []), ...newEntries];
    this.updatePreview();
  });

  for (const entry of newEntries) {
    await this.readBrowserEntry(entry);
  }

  this.ngZone.run(() => {
    this.updatePreview();
    this.status = '';
  });
  }

  private async readBrowserEntry(entry: any): Promise<void> {
    const f: File | undefined = entry?.fileRef;
    if (!f) {
      entry.readError = 'Missing browser file reference';
      entry.reading = false;
      return;
    }

    try {
      let text: string;
      if (typeof (f as any).text === 'function') {
        text = await (f as any).text();
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(f);
        });
      }

      this.ngZone.run(() => {
        entry.text = text;
        entry.size = text ? text.length : entry.size;
        entry.readError = undefined;
      });
    } catch (e) {
      const readError = String((e as any)?.message ?? 'Read failed');
      this.logs.warn('Join Backups: failed to read file (browser)', { name: entry?.name, error: readError });
      this.ngZone.run(() => {
        entry.readError = readError;
      });
    } finally {
      this.ngZone.run(() => {
        entry.reading = false;
      });
    }
  }

  private detectTauriRuntime(): boolean {
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

  async addFilesNative() {
    if (!this.detectTauriRuntime()) {
      this.ngZone.run(() => {
        this.status = 'Native file picker is only available in the desktop app (Tauri).';
      });
		this.logs.warn('Join Backups: native picker requested, but not in Tauri runtime');
      return;
    }

    // Tauri open dialog
    try {
      const { open } = await import('@tauri-apps/plugin-dialog') as any;
      const paths = await open({ multiple: true, filters: [{ name: 'XML', extensions: ['xml'] }] });
      if (!paths) return;
      const pArr = Array.isArray(paths) ? paths : [paths];
  		this.logs.info('Join Backups: adding files (native)', { count: pArr.length });
    const newEntries = pArr.map((p) => {
      const name = String(p).split(/[\\/]/).pop();
      return {
        name: name || String(p),
        size: 0,
        text: undefined as string | undefined,
        path: String(p),
        readError: undefined as string | undefined,
        reading: true,
        expanded: false,
        details: undefined as any
      };
    });

    this.ngZone.run(() => {
      this.status = 'Reading files...';
      this.selectedFiles = [...(this.selectedFiles ?? []), ...newEntries];
      this.updatePreview();
    });

    const { readTextFile } = await import('@tauri-apps/plugin-fs') as any;
    for (const entry of newEntries) {
      try {
        const text = await readTextFile(entry.path);
        this.ngZone.run(() => {
          entry.text = text;
          entry.size = text ? text.length : 0;
          entry.readError = undefined;
        });
      } catch (e) {
        const readError = String((e as any)?.message ?? 'Read failed');
        this.logs.warn('Join Backups: failed to read file (native)', { path: entry.path, error: readError });
        this.ngZone.run(() => {
          entry.readError = readError;
        });
      } finally {
        this.ngZone.run(() => {
          entry.reading = false;
        });
      }
    }

    this.ngZone.run(() => {
      this.updatePreview();
      this.status = '';
    });
    } catch (e) {
      console.warn('native pick error', e);
		this.ngZone.run(() => {
			this.status = `Native file picker not available: ${String((e as any)?.message ?? e)}`;
		});
		this.logs.error('Join Backups: native file picker error', e);
    }
  }

  removeFile(index: number) {
  this.ngZone.run(() => {
    this.selectedFiles = (this.selectedFiles ?? []).filter((_, i) => i !== index);
    this.updatePreview();
  });
  }

  async retryRead(index: number) {
    const f = this.selectedFiles[index];
    if (!f) return;
    f.readError = undefined;
    f.reading = true;
    try {
      // Browser file reference
      if (f.fileRef) {
			await this.readBrowserEntry(f);
      } else if (f.path) {
        // Native path — ensure Tauri runtime available first
        if (!this.detectTauriRuntime()) {
          f.readError = 'Native runtime not available';
          return;
        }
        // Native path, use Tauri fs plugin
        const { readTextFile } = await import('@tauri-apps/plugin-fs') as any;
        const text = await readTextFile(f.path);
        f.text = text;
        f.size = text ? text.length : f.size;
      }
      this.updatePreview();
    } catch (e) {
      f.readError = String((e as any)?.message ?? 'Read failed');
    } finally {
      f.reading = false;
    }
  }

  toggleDetails(index: number) {
    const f = this.selectedFiles[index];
    if (!f) return;
	this.ngZone.run(() => {
		f.expanded = !f.expanded;
    if (f.expanded && !f.details && f.text) {
      void this.computeDetailsAsync(f);
    }
	});
  }

  private async ensureFastXmlLoaded(): Promise<{ XMLParser: any; XMLBuilder: any } | null> {
    if (this.fastXml) {
      return this.fastXml;
    }
    if (this.fastXmlLoad) {
      return this.fastXmlLoad;
    }
    this.fastXmlLoad = (async () => {
      try {
        const mod: any = await import('fast-xml-parser');
        const XMLParser = mod?.XMLParser ?? mod?.default?.XMLParser;
        const XMLBuilder = mod?.XMLBuilder ?? mod?.default?.XMLBuilder;
        if (!XMLParser || !XMLBuilder) {
          return null;
        }
        this.fastXml = { XMLParser, XMLBuilder };
        return this.fastXml;
      } catch {
        return null;
      } finally {
        // keep the resolved value in this.fastXml; avoid holding a rejected promise
        this.fastXmlLoad = undefined;
      }
    })();
    return this.fastXmlLoad;
  }

  private tryGetFastXml(): { XMLParser: any; XMLBuilder: any } | null {
    return this.fastXml;
  }

  private fallbackCount(text: string): { messages: number; contacts: number } {
    const smsMatches = text.match(/<sms\b/gi) || [];
    const addrMatches = text.match(/address=(?:'|")([^'"]+)(?:'|")/gi) || [];
    const contacts = new Set<string>();
    for (const m of addrMatches) {
      const addr = m.replace(/address=("|')|("|')/g, '');
      if (addr) contacts.add(addr);
    }
    return { messages: smsMatches.length, contacts: contacts.size };
  }

  private async computeDetailsAsync(f: any): Promise<void> {
    if (!f?.text) {
      f.details = undefined;
      return;
    }
    try {
      const fastXml = await this.ensureFastXmlLoaded();
      let messages = 0;
      const contacts = new Set<string>();
      let fallbackContacts = 0;
      if (fastXml?.XMLParser) {
        const p = new fastXml.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const parsed = p.parse(f.text);
        const root = parsed && parsed[Object.keys(parsed)[0]];
        const sms = root && root.sms ? (Array.isArray(root.sms) ? root.sms : [root.sms]) : [];
        messages = sms.length;
        for (const m of sms) {
          const addr = m['@_address'] || m.address || '';
          if (addr) contacts.add(addr);
        }
      } else {
        const fb = this.fallbackCount(f.text);
        messages = fb.messages;
        fallbackContacts = fb.contacts;
      }
      const sample = f.text.length > 500 ? f.text.slice(0, 500) + '...' : f.text;
      f.details = { messages, contacts: contacts.size || fallbackContacts, sample };
    } catch (e) {
      f.details = { messages: 0, contacts: 0, sample: '', parseError: String((e as any)?.message ?? 'Parse failed') };
    }
  }

  updatePreview() {
	const fastXml = this.tryGetFastXml();
    const parser = fastXml?.XMLParser;
    let messages = 0;
    const contacts = new Set<string>();
    for (const f of this.selectedFiles) {
      if (!f.text) continue;
      try {
        if (parser) {
			const p = new parser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
			const parsed = p.parse(f.text);
			const root = parsed && parsed[Object.keys(parsed)[0]];
			const sms = root && root.sms ? (Array.isArray(root.sms) ? root.sms : [root.sms]) : [];
			messages += sms.length;
			for (const m of sms) {
				const addr = m['@_address'] || m.address || '';
				if (addr) contacts.add(addr);
			}
		} else {
			const fb = this.fallbackCount(f.text);
			messages += fb.messages;
			// we can only approximate contacts in fallback; keep best-effort via regex
			const addrMatches = f.text.match(/address=(?:'|")([^'"]+)(?:'|")/gi) || [];
			for (const m of addrMatches) {
				const addr = m.replace(/address=("|')|("|')/g, '');
				if (addr) contacts.add(addr);
			}
		}
      } catch (e) {
        // ignore parse errors for preview
      }
    }
    this.preview = { files: this.selectedFiles.length, messages, contacts: contacts.size };
  }

  async mergeAndSave() {
    if (!this.selectedFiles.length) {
      this.status = 'No files selected';
      return;
    }
    this.status = 'Merging...';
    try {
		this.logs.info('Join Backups: merge started', { files: this.selectedFiles.length });
    const fastXml = await this.ensureFastXmlLoaded();
    if (!fastXml?.XMLParser || !fastXml?.XMLBuilder) {
      this.status = 'Merge failed: XML parser not available.';
      this.logs.error('Join Backups: XML parser not available (fast-xml-parser import failed)');
      return;
    }
    const p = new fastXml.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const b = new fastXml.XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true });

      let merged = [];
      let topName: string | null = null;
      let topAttrs: any = {};

      for (const f of this.selectedFiles) {
        if (!f.text) continue;
        const parsed = p.parse(f.text);
        const keys = Object.keys(parsed);
        if (!keys.length) continue;
        const rootName = keys[0];
        const root = parsed[rootName];
        if (!topName) {
          topName = rootName;
          for (const k of Object.keys(root || {})) if (k.startsWith('@_')) topAttrs[k] = root[k];
        }
        const sms = root && root.sms ? (Array.isArray(root.sms) ? root.sms : [root.sms]) : [];
        merged = merged.concat(sms);
      }

      const outRoot: any = Object.assign({}, topAttrs);
      outRoot['sms'] = merged;
      outRoot['@_count'] = String(merged.length);
      const outObj: any = {};
      outObj[topName || 'smses'] = outRoot;
      const xml = b.build(outObj);

      // Save using Tauri dialog + fs if available, else fallback to download
      try {
        const { save } = await import('@tauri-apps/plugin-dialog') as any;
        const path = await save({ defaultPath: 'merged.xml' });
        if (path) {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs') as any;
          await writeTextFile(path, xml);
          // show toast
          try { const { ToastService } = await import('../toast.service'); } catch (e) {}
          this.status = `Saved to ${path}`;
			this.logs.info('Join Backups: merge saved (native)', { path, messages: merged.length });
          return;
        }
      } catch (e) {
        console.warn('native save failed', e);
		this.logs.warn('Join Backups: native save failed, falling back to browser download', e);
      }

      // browser fallback
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.xml';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.status = 'Downloaded merged.xml';
		this.logs.info('Join Backups: merge downloaded (browser)', { messages: merged.length });
    } catch (e) {
      console.error(e);
      this.status = 'Merge failed: ' + String((e as any)?.message || e);
		this.logs.error('Join Backups: merge failed', e);
    }
  }

  clearAll() {
  this.ngZone.run(() => {
    this.selectedFiles = [];
    this.updatePreview();
    this.status = '';
  });
  }
}
