import { ChangeDetectionStrategy, Component, inject, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Visit } from '../core/models';
import { ToastService } from '../core/toast.service';
import { StarsComponent } from './stars.component';

const QUICK_NOTES = ['Çok lezzetliydi 😋', 'Porsiyon küçük', 'Servis yavaştı', 'Fiyat/performans iyi', 'Kalabalıktı', 'Tekrar gelirim'];

/** Geçmişteki bir ziyarete puan ve not verme sheet'i. */
@Component({
  selector: 'app-rate-sheet',
  imports: [FormsModule, StarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()">
      <div class="sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="rate-title">
        <p class="muted small">{{ visitDate() }}</p>
        <h2 id="rate-title">{{ visit().restaurantName }} nasıldı?</h2>

        <div class="stars-big">
          <app-stars [(value)]="stars" [editable]="true" [size]="42" idPrefix="rate" />
          <p class="hint">{{ hint() }}</p>
        </div>

        <div class="quick">
          @for (q of quickNotes; track q) {
            <button type="button" class="chip" (click)="addQuick(q)">{{ q }}</button>
          }
        </div>

        <label for="rate-note" class="lbl">Not</label>
        <textarea id="rate-note" class="textarea" rows="3" maxlength="1000" [(ngModel)]="note"
                  placeholder="Ne yedin, nasıldı? Bir dahakine hatırlatırız…"></textarea>

        <div class="actions">
          <button id="rate-cancel-btn" type="button" class="btn btn-ghost" (click)="closed.emit()">Vazgeç</button>
          <button id="rate-save-btn" type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
            {{ saving() ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    h2 { font-size: 24px; margin: 4px 0 18px; }
    .small { font-size: 13px; }
    .stars-big { text-align: center; margin: 6px 0 16px; }
    .hint { margin-top: 6px; color: var(--muted); min-height: 20px; font-weight: 500; }
    .quick { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .quick .chip { font-size: 13px; padding: 7px 12px; }
    .lbl { display: block; font-size: 13px; color: var(--muted); margin: 0 4px 6px; }
    .actions { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 18px; }
  `,
})
export class RateSheetComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly visit = input.required<Visit>();
  readonly closed = output<void>();
  readonly saved = output<Visit>();

  readonly quickNotes = QUICK_NOTES;
  readonly stars = signal<number | null>(null);
  readonly saving = signal(false);
  note = '';

  constructor() {
    effect(() => {
      const v = this.visit();
      this.stars.set(v.stars);
      this.note = v.note ?? '';
    });
  }

  hint() {
    return ['', 'Hiç beğenmedim 😞', 'Pek iyi değildi 😕', 'İdare eder 🙂', 'Güzeldi 😋', 'Harika! 🤩'][this.stars() ?? 0];
  }

  visitDate() {
    return new Date(this.visit().visitedAt).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  addQuick(q: string) {
    this.note = this.note ? `${this.note.trim()} · ${q}` : q;
  }

  async save() {
    this.saving.set(true);
    try {
      const v = await this.api.rateVisit(this.visit().id, this.stars(), this.note.trim() || null);
      this.toast.success('Puanın kaydedildi ⭐');
      this.saved.emit(v);
    } catch {
      this.toast.error('Kaydedilemedi, tekrar dene.');
    } finally {
      this.saving.set(false);
    }
  }
}
