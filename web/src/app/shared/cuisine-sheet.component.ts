import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FilterService, Filters } from '../core/filter.service';
import { FormsModule } from '@angular/forms';

interface PricePreset {
  label: string;
  min: number | null;
  max: number | null;
}

const PRESETS: PricePreset[] = [
  { label: 'Farketmez', min: null, max: null },
  { label: '0 - 250 ₺', min: 0, max: 250 },
  { label: '0 - 500 ₺', min: 0, max: 500 },
  { label: '250 - 500 ₺', min: 250, max: 500 },
  { label: '500 - 1000 ₺', min: 500, max: 1000 },
  { label: '1000+ ₺', min: 1000, max: null },
];

/** "Ne tarz bir şey olsun?" çoktan seçmeli filtre sheet'i + Yemek Kartı + Bütçe + Mesafe. */
@Component({
  selector: 'app-cuisine-sheet',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()">
      <div class="sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="cuisine-title">
        <h2 id="cuisine-title">{{ title() }}</h2>
        <p class="muted sub">Birden fazla filtre seçebilirsin. Seçmediklerin için tümü gösterilir.</p>

        <!-- Yemek Tarzı Çipleri -->
        <div class="grid">
          @for (c of fs.all(); track c.code) {
            <button type="button" class="opt" [id]="'cuisine-' + c.code" [class.active]="draft().cuisines.includes(c.code)" (click)="toggle(c.code)">
              <span class="emo">{{ c.emoji }}</span>
              <span>{{ c.label }}</span>
            </button>
          }
        </div>

        <!-- Yemek Kartı ile Ödeme Bölümü -->
        <div class="row-head">
          <span>💳 Geçerli Yemek Kartı</span>
          <strong class="highlight-val">
            @if (draft().mealCards.length === 0) {
              Farketmez (Tümü)
            } @else {
              {{ draft().mealCards.length }} kart seçildi
            }
          </strong>
        </div>
        <p class="sub-hint muted">Sadece bu yemek kartını kabul eden restoranları listele:</p>
        <div class="meal-card-grid">
          @for (m of fs.allMealCards(); track m.code) {
            <button type="button" class="meal-btn" [class.active]="draft().mealCards.includes(m.code)" (click)="toggleMealCard(m.code)">
              <span class="meal-emo">{{ m.emoji }}</span>
              <span>{{ m.label }}</span>
            </button>
          }
        </div>

        <!-- Mesafe Slider (20 km'ye kadar) -->
        <div class="row-head">
          <span>Maksimum mesafe</span>
          <strong class="highlight-val">{{ draft().radius >= 1000 ? (draft().radius / 1000).toFixed(1) + ' km' : draft().radius + ' m' }}</strong>
        </div>
        <input id="radius-range" type="range" min="300" max="20000" step="500" [value]="draft().radius"
               (input)="patch({ radius: +$any($event.target).value })" aria-label="Maksimum mesafe" />
        <div class="range-labels muted">
          <span>300 m</span>
          <span>5 km</span>
          <span>10 km</span>
          <span>20 km</span>
        </div>

        <!-- Bütçe Aralığı (TL Elle Giriş + Hızlı Butonlar) -->
        <div class="row-head">
          <span>Bütçe Aralığı (Kişi Başı TL)</span>
          <strong class="highlight-val">
            @if (draft().minPriceTl === null && draft().maxPriceTl === null) {
              Fark etmez
            } @else if (draft().minPriceTl !== null && draft().maxPriceTl !== null) {
              {{ draft().minPriceTl }} - {{ draft().maxPriceTl }} ₺
            } @else if (draft().maxPriceTl !== null) {
              En çok {{ draft().maxPriceTl }} ₺
            } @else {
              En az {{ draft().minPriceTl }} ₺
            }
          </strong>
        </div>

        <!-- Hızlı Bütçe Çipleri -->
        <div class="seg">
          @for (p of presets; track p.label) {
            <button type="button" class="chip" [class.active]="isPresetActive(p)" (click)="setPreset(p)">
              {{ p.label }}
            </button>
          }
        </div>

        <!-- Elle Bütçe Girişi (0 - 500 gibi) -->
        <div class="custom-budget-row">
          <div class="budget-input-group">
            <label for="min-price-input" class="muted small-lbl">En Az</label>
            <div class="input-with-symbol">
              <input id="min-price-input" type="number" min="0" max="5000" step="50" class="input"
                     [value]="draft().minPriceTl ?? ''"
                     (input)="patch({ minPriceTl: $any($event.target).value ? +$any($event.target).value : null })"
                     placeholder="0" />
              <span class="symbol">₺</span>
            </div>
          </div>
          <span class="dash">-</span>
          <div class="budget-input-group">
            <label for="max-price-input" class="muted small-lbl">En Çok</label>
            <div class="input-with-symbol">
              <input id="max-price-input" type="number" min="0" max="5000" step="50" class="input"
                     [value]="draft().maxPriceTl ?? ''"
                     (input)="patch({ maxPriceTl: $any($event.target).value ? +$any($event.target).value : null })"
                     placeholder="500" />
              <span class="symbol">₺</span>
            </div>
          </div>
        </div>

        <!-- Tekrar Etmeme Süresi -->
        <div class="row-head">
          <span>Son kaç günde gittiklerimi önerme</span>
          <strong>{{ draft().avoidDays }} gün</strong>
        </div>
        <input id="avoid-range" type="range" min="0" max="14" step="1" [value]="draft().avoidDays"
               (input)="patch({ avoidDays: +$any($event.target).value })" aria-label="Tekrar etmeme süresi" />

        <div class="actions">
          <button id="cuisine-clear-btn" type="button" class="btn btn-ghost" (click)="clearFilters()">Sıfırla</button>
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
    .sub-hint { font-size: 12.5px; margin: 0 0 10px; }
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

    .meal-card-grid {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;
    }
    .meal-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 14px; border-radius: 99px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border);
      color: #ccc; font: 500 13px 'Outfit', sans-serif; cursor: pointer; transition: all .2s;
      &:hover { background: rgba(255,255,255,0.12); color: #fff; }
      &.active {
        background: linear-gradient(135deg, hsla(270, 70%, 55%, 0.3), hsla(220, 80%, 55%, 0.3));
        border-color: #a855f7; color: #fff; font-weight: 600;
        box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.25);
      }
    }
    .meal-emo { font-size: 16px; }

    .row-head { display: flex; justify-content: space-between; margin: 22px 4px 8px; font-size: 14px; color: var(--muted); strong { color: var(--text); } }
    .highlight-val { color: var(--accent-1) !important; font-weight: 700; }
    .range-labels { display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; padding: 0 2px; }
    .seg { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .custom-budget-row {
      display: flex; align-items: flex-end; gap: 10px; margin-bottom: 8px;
    }
    .budget-input-group { flex: 1; }
    .small-lbl { font-size: 11.5px; display: block; margin-bottom: 4px; }
    .dash { padding-bottom: 14px; font-weight: bold; color: var(--muted); }
    .input-with-symbol {
      position: relative;
      input { padding-right: 32px; font-size: 15px; }
      .symbol { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-weight: bold; }
    }
    .actions { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 24px; }
  `,
})
export class CuisineSheetComponent {
  readonly fs = inject(FilterService);
  readonly title = input('Ne tarz bir şey olsun?');
  readonly applyLabel = input('Uygula');
  readonly closed = output<void>();
  readonly applied = output<Filters>();

  readonly presets = PRESETS;
  readonly draft = signal<Filters>({ ...this.fs.filters() });

  toggle(code: string) {
    const cur = this.draft().cuisines;
    this.patch({ cuisines: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] });
  }

  toggleMealCard(code: string) {
    const cur = this.draft().mealCards ?? [];
    this.patch({ mealCards: cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code] });
  }

  patch(p: Partial<Filters>) {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  isPresetActive(p: PricePreset): boolean {
    const d = this.draft();
    return d.minPriceTl === p.min && d.maxPriceTl === p.max;
  }

  setPreset(p: PricePreset) {
    this.patch({ minPriceTl: p.min, maxPriceTl: p.max });
  }

  clearFilters() {
    this.patch({ cuisines: [], mealCards: [], minPriceTl: null, maxPriceTl: null, maxPrice: null, radius: 2500 });
  }

  apply() {
    this.fs.set(this.draft());
    this.applied.emit(this.draft());
  }
}
