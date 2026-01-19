import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  timeoutMs?: number;
  actionLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = new Subject<Toast>();
  toasts$ = this._toasts.asObservable();
  private actions = new Map<string, () => void | Promise<void>>();

  show(message: string, timeoutMs: number = 5000) {
    const t: Toast = { id: String(Date.now()) + Math.random().toString(36).slice(2, 8), message, timeoutMs };
    this._toasts.next(t);
    return t.id;
  }

  showWithAction(message: string, actionLabel: string, action: () => void | Promise<void>, timeoutMs: number = 7000) {
    const t: Toast = { id: String(Date.now()) + Math.random().toString(36).slice(2, 8), message, timeoutMs, actionLabel };
    this.actions.set(t.id, action);
    this._toasts.next(t);
    return t.id;
  }

  performAction(id: string) {
    const action = this.actions.get(id);
    if (action) {
      try {
        const result = action();
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).catch(() => {});
        }
      } finally {
        this.actions.delete(id);
      }
    }
  }
}
