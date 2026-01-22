import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-dialog.component.html',
  styleUrls: ['./about-dialog.component.css']
})
export class AboutDialogComponent {
  @Input() version: string = '';
  @Input() buildTime: string = '';
  @Input() commit: string = '';
  @Output() close = new EventEmitter<void>();

  get buildTimeLocal(): string {
    const raw = (this.buildTime || '').trim();
    if (!raw) {
      return '';
    }
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) {
      return raw;
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }).format(d);
    } catch {
      return d.toLocaleString();
    }
  }

  onClose() {
    this.close.emit();
  }

  copyInfo() {
    try {
		const text = `v${this.version} — built ${this.buildTimeLocal || this.buildTime}${this.commit ? ' — ' + this.commit : ''}`;
      navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }
}