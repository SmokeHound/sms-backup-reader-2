import { Component, OnDestroy } from '@angular/core';
import { ToastService, Toast } from './toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toasts" class="toast" [attr.data-id]="t.id">
        <div class="toast-body">
          <div class="toast-message">{{ t.message }}</div>
          <div class="toast-actions" *ngIf="t.actionLabel">
            <button class="toast-action" (click)="onAction(t.id)">{{ t.actionLabel }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        right: 16px;
        bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 14px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 420px;
        font-size: 13px;
      }
      .toast-body { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .toast-message { flex: 1 1 auto; }
      .toast-actions { flex: 0 0 auto; }
      .toast-action { background: rgba(255,255,255,0.08); color: white; border: none; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
    `,
  ],
})
export class ToastComponent implements OnDestroy {
  toasts: Toast[] = [];
  private sub: Subscription;

  constructor(private toastService: ToastService) {
    this.sub = this.toastService.toasts$.subscribe((t) => this.pushToast(t));
  }

  private pushToast(t: Toast) {
    this.toasts.push(t);
    if (t.timeoutMs && t.timeoutMs > 0) {
      setTimeout(() => this.removeToast(t.id), t.timeoutMs);
    }
  }

  onAction(id: string) {
    this.toastService.performAction(id);
    this.removeToast(id);
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter((x) => x.id !== id);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
