import { Component } from '@angular/core';
import { CsvExportService } from '../csv-export.service';

@Component({
  selector: 'app-join-backups',
  templateUrl: './join-backups.component.html',
  styleUrls: ['./join-backups.component.css']
})
export class JoinBackupsComponent {
  selectedFiles: Array<{ name: string; size: number; text?: string; path?: string }> = [];
  status = '';
  preview = { files: 0, messages: 0, contacts: 0 };

  constructor(private csvExport: CsvExportService) {}

  async addFilesBrowser(files: FileList | null) {
    if (!files) return;
    this.status = 'Reading files...';
    const arr = Array.from(files);
    for (const f of arr) {
      try {
        const text = await f.text();
        this.selectedFiles.push({ name: f.name, size: f.size, text });
      } catch (e) {
        console.warn(e);
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
        try {
          const text = await readText(p);
          const name = p.split(/[\\/]/).pop();
          this.selectedFiles.push({ name: name || p, size: text.length, text, path: p });
        } catch (e) {
          console.warn('read error', e);
        }
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
