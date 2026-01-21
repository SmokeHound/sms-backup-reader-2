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

  onClose() {
    this.close.emit();
  }

  copyInfo() {
    try {
      const text = `v${this.version} — built ${this.buildTime}${this.commit ? ' — ' + this.commit : ''}`;
      navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }
}