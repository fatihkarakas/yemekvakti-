import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; text: string; kind: 'info' | 'success' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(text: string, kind: Toast['kind'] = 'info', ms = 2800) {
    const t = { id: ++this.seq, text, kind };
    this.toasts.update((l) => [...l, t]);
    setTimeout(() => this.toasts.update((l) => l.filter((x) => x.id !== t.id)), ms);
  }

  info(text: string) { this.show(text, 'info'); }
  success(text: string) { this.show(text, 'success'); }
  error(text: string) { this.show(text, 'error', 4000); }
}
