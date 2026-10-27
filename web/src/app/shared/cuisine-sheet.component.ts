import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FilterService, Filters } from '../core/filter.service';

/** "Ne tarz bir şey olsun?" çoktan seçmeli filtre sheet'i. */
@Component({
  selector: 'app-cuisine-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()">
      <div class="sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="cuisine-title">
        <h2 id="cuisine-title">{{ title() }}</h2>
        <p class="muted sub">Birden fazla seçebilirsin. Hiç seçmezsen hepsi gelir.</p>

        <div class="grid">
          @for (c of fs.all(); track c.code) {
            <button type="button" class="opt" [id]="'cuisine-' + c.code" [class.active]="draft().cuisines.includes(c.code)" (click)="toggle(c.code)">
              <span class="emo">{{ c.emoji }}</span>
              <span>{{ c.label }}</span>
            </button>
          }
        </div>

        <div class="row-head">
          <span>Maksimum mesafe</span>
          <strong>{{ draft().radius >= 1000 ? (draft().radius / 1000).toFixed(1) + ' km' : draft().radius + ' m' }}</strong>
        </div>
        <input id="radius-range" type="range" min="300" max="5000" step="100" [value]="draft().radius"
               (input)="patch({ radius: +$any($event.target).value })" aria-label="Maksimum mesafe" />

        <div class="row-head"><span>Bütçe</span></div>
        <div class="seg">
          @for (p of prices; track p.v) {
            <button type="button" class="chip" [id]="'price-' + (p.v ?? 'all')" [class.active]="draft().maxPrice === p.v" (click)="patch({ maxPrice: p.v })">{{ p.l }}</button>
          }
        </div>

        <div class="row-head">
          <span>Son kaç günde gittiklerimi önerme</span>
          <strong>{{ draft().avoidDays }} gün</strong>
        </div>
        <input id="avoid-range" type="range" min="0" max="14" step="1" [value]="draft().avoidDays"
               (input)="patch({ avoidDays: +$any($event.target).value })" aria-label="Tekrar etmeme süresi" />

        <div class="actions">
          <button id="cuisine-clear-btn" type="button" class="btn btn-ghost" (click)="patch({ cuisines: [] })">Temizle</button>
          <button id="cuisine-apply-btn" type="button" class="btn btn-primary" (click)="apply()">
            {{ applyLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    h2 { font-size: 24px; }
    .sub { margin: 6px 0 18px; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .opt {
      display: flex; align-items: center; gap: 10px;
      padding: 14px; border-radius: 16px;
      background: var(--surface); border: 1px solid var(--border);
      color: var(--text); font: 500 14.5px 'Outfit', sans-serif; text-align: left;
      cursor: pointer; transition: all .2s cubic-bezier(0.34,1.56,0.64,1);
      &:active { transform: scale(0.95); }
      &.active {
        background: linear-gradient(135deg, hsla(22,100%,62%,0.22), hsla(340,86%,60%,0.22));
        border-color: hsla(340,86%,60%,0.75);
        box-shadow: 0 0 0 3px hsla(340,86%,60%,0.15);
      }
    }
    .emo { font-size: 24px; }
    .row-head { display: flex; justify-content: space-between; margin: 22px 4px 8px; font-size: 14px; color: var(--muted); strong { color: var(--text); } }
    .seg { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 24px; }
  `,
})
export class CuisineSheetComponent {
  readonly fs = inject(FilterService);
  readonly title = input('Ne tarz bir şey olsun?');
  readonly applyLabel = input('Uygula');
  readonly closed = output<void>();
  readonly applied = output<Filters>();

  readonly prices = [
    { v: null, l: 'Farketmez' },
    { v: 1, l: '₺' },
    { v: 2, l: '₺₺' },
    { v: 3, l: '₺₺₺' },
  ];

  readonly draft = signal<Filters>({ ...this.fs.filters() });

  toggle(code: string) {
    const cur = this.draft().cuisines;
    this.patch({ cuisines: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] });
  }

  patch(p: Partial<Filters>) {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  apply() {
    this.fs.set(this.draft());
    this.applied.emit(this.draft());
  }
}
