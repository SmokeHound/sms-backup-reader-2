import { Component } from '@angular/core';
import { CsvExportService } from '../csv-export.service';

@Component({
  selector: 'app-join-backups',
  templateUrl: './join-backups.component.html',
  styleUrls: ['./join-backups.component.css']
})
export class JoinBackupsComponent {
  selectedFiles: Array<{ name: string; size: number; text?: string; path?: string; fileRef?: File; readError?: string; reading?: boolean; expanded?: boolean; details?: { messages: number; contacts: number; sample?: string; parseError?: string } }> = [];
  status = '';
  preview = { files: 0, messages: 0, contacts: 0 };

  constructor(private csvExport: CsvExportService) {}

  async addFilesBrowser(files: FileList | null) {
    if (!files) return;
    this.status = 'Reading files...';
    const arr = Array.from(files);
    for (const f of arr) {
      let text: string | undefined = undefined;
      let readError: string | undefined = undefined;
      try {
        if (typeof (f as any).text === 'function') {
          text = await (f as any).text();
        } else {
          // Fallback for environments where File.text() isn't available
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(f);
          });
        }
      } catch (e) {
        console.warn('Failed to read file content, adding placeholder', e);
        readError = String((e as any)?.message ?? 'Read failed');
      } finally {
        // Always add the file entry so the user can see it and act on it.
        this.selectedFiles.push({ name: f.name, size: f.size, text, fileRef: f, readError, expanded: false, details: undefined });
      }
    }
    this.updatePreview();
    this.status = '';
  }

  async addFilesNative() {
    // Tauri open dialog
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const paths = await open({ multiple: true, filters: [{ name: 'XML', extensions: ['xml'] }] });
      if (!paths) return;
      const pArr = Array.isArray(paths) ? paths : [paths];
      const { readText } = await import('@tauri-apps/api/fs');
      for (const p of pArr) {
        let text: string | undefined = undefined;
        let readError: string | undefined = undefined;
        try {
          text = await readText(p);
        } catch (e) {
          console.warn('read error', e);
          readError = String((e as any)?.message ?? 'Read failed');
        }
        const name = p.split(/[\\/]/).pop();
        this.selectedFiles.push({ name: name || p, size: text ? text.length : 0, text, path: p, readError, expanded: false, details: undefined });
      }
      this.updatePreview();
    } catch (e) {
      console.warn('native pick error', e);
      this.status = 'Native file picker not available';
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.updatePreview();
  }

  async retryRead(index: number) {
    const f = this.selectedFiles[index];
    if (!f) return;
    f.readError = undefined;
    f.reading = true;
    try {
      // Browser file reference
      if (f.fileRef) {
        let text: string | undefined = undefined;
        if (typeof (f.fileRef as any).text === 'function') {
          text = await (f.fileRef as any).text();
        } else {
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(f.fileRef as File);
          });
        }
        f.text = text;
        f.size = text ? text.length : f.size;
      } else if (f.path) {
        // Native path, use Tauri fs
        const { readText } = await import('@tauri-apps/api/fs');
        const text = await readText(f.path);
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
    f.expanded = !f.expanded;
    if (f.expanded && !f.details && f.text) {
      this.computeDetails(f);
    }
  }

  private computeDetails(f: any) {
    if (!f.text) {
      f.details = undefined;
      return;
    }
    try {
      const parserCtor = (window as any)['fastXmlParser']?.XMLParser;
      let messages = 0;
      const contacts = new Set<string>();
      if (parserCtor) {
        const p = new parserCtor({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const parsed = p.parse(f.text);
        const root = parsed && parsed[Object.keys(parsed)[0]];
        const sms = root && root.sms ? (Array.isArray(root.sms) ? root.sms : [root.sms]) : [];
        messages = sms.length;
        for (const m of sms) {
          const addr = m['@_address'] || m.address || '';
          if (addr) contacts.add(addr);
        }
      } else {
        const smsMatches = f.text.match(/<sms\b/gi) || [];
        messages = smsMatches.length;
        const addrMatches = f.text.match(/address=(?:'|")([^'"]+)(?:'|")/gi) || [];
        for (const m of addrMatches) {
          const addr = m.replace(/address=("|')|("|')/g, '');
          if (addr) contacts.add(addr);
        }
      }
      const sample = f.text.length > 500 ? f.text.slice(0, 500) + '...' : f.text;
      f.details = { messages, contacts: contacts.size, sample };
    } catch (e) {
      f.details = { messages: 0, contacts: 0, sample: '', parseError: String((e as any)?.message ?? 'Parse failed') };
    }
  }

  updatePreview() {
    const parser = (window as any)['fastXmlParser']?.XMLParser;
    let messages = 0;
    const contacts = new Set<string>();
    for (const f of this.selectedFiles) {
      if (!f.text) continue;
      try {
        const p = new parser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const parsed = p.parse(f.text);
        const root = parsed && parsed[Object.keys(parsed)[0]];
        const sms = root && root.sms ? (Array.isArray(root.sms) ? root.sms : [root.sms]) : [];
        messages += sms.length;
        for (const m of sms) {
          const addr = m['@_address'] || m.address || '';
          if (addr) contacts.add(addr);
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
      const parser = (window as any)['fastXmlParser'].XMLParser;
      const builder = (window as any)['fastXmlParser'].XMLBuilder;
      const p = new parser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const b = new builder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true });

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
        const { save } = await import('@tauri-apps/api/dialog');
        const path = await save({ defaultPath: 'merged.xml' });
        if (path) {
          const { writeTextFile } = await import('@tauri-apps/api/fs');
          await writeTextFile({ path, contents: xml });
          // show toast
          try { const { ToastService } = await import('../toast.service'); } catch (e) {}
          this.status = `Saved to ${path}`;
          return;
        }
      } catch (e) {
        console.warn('native save failed', e);
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
    } catch (e) {
      console.error(e);
      this.status = 'Merge failed: ' + String((e as any)?.message || e);
    }
  }

  clearAll() {
    this.selectedFiles = [];
    this.updatePreview();
  }
}
