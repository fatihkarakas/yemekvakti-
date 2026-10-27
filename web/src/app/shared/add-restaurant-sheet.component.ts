import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { FilterService } from '../core/filter.service';
import { LocationService } from '../core/location.service';

@Component({
  selector: 'app-add-restaurant-sheet',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()">
      <div class="sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="add-rest-title">
        <div class="sheet-header">
          <h2 id="add-rest-title">➕ Yeni Restoran / Mekan Ekle</h2>
          <button type="button" class="close-x" (click)="closed.emit()" aria-label="Kapat">✕</button>
        </div>
        <p class="muted sub">Eklediğin mekan veri tabanına kaydedilir; çarkta ve akıllı önerilerde hemen yer alır.</p>

        <form (ngSubmit)="save()" class="form-body">
          <!-- Mekan Adı -->
          <div class="field">
            <label for="rest-name">Mekan Adı <span class="req">*</span></label>
            <input id="rest-name" type="text" [(ngModel)]="name" name="name"
                   placeholder="Örn: Kemah Ekmek Teknesi, Koç Cağ Kebabı" required autocomplete="off" />
          </div>

          <!-- Mutfak / Tür Seçimi (Chips) -->
          <div class="field">
            <label>Mutfak / Kategori</label>
            <div class="cuisine-chips">
              @for (c of fs.all(); track c.code) {
                <button type="button" class="chip" [class.active]="selectedCuisines().includes(c.code)" (click)="toggleCuisine(c.code)">
                  <span>{{ c.emoji }}</span>
                  <span>{{ c.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Geçerli Yemek Kartları (Chips) -->
          <div class="field">
            <label>Geçerli Yemek Kartları</label>
            <div class="cuisine-chips">
              @for (m of fs.allMealCards(); track m.code) {
                <button type="button" class="chip" [class.active]="selectedMealCards().includes(m.code)" (click)="toggleMealCard(m.code)">
                  <span>{{ m.emoji }}</span>
                  <span>{{ m.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Adres & Semt -->
          <div class="field">
            <label for="rest-addr">Adres veya Semt</label>
            <input id="rest-addr" type="text" [(ngModel)]="address" name="address"
                   placeholder="Örn: Şaşmaz Oto Sanayi 1757. Sokak No: 22" autocomplete="off" />
          </div>

          <!-- Tahmini Fiyat (TL) -->
          <div class="field">
            <label for="rest-price">Ortalama Kişi Başı Fiyat (₺)</label>
            <div class="input-prefix-box">
              <span class="currency-sym">₺</span>
              <input id="rest-price" type="number" [(ngModel)]="priceTl" name="priceTl" min="0" max="5000" step="10" placeholder="280" />
            </div>
          </div>

          <!-- Koordinat Bilgisi -->
          <div class="coords-box">
            <div class="coords-header">
              <span class="muted">📍 Konum Koordinatları:</span>
              <button type="button" class="btn-use-current" (click)="useCurrentLocation()">Mevcut Konumumu Kullan</button>
            </div>
            <div class="coords-row">
              <input type="number" step="0.0001" [(ngModel)]="lat" name="lat" placeholder="Enlem (Lat)" />
              <input type="number" step="0.0001" [(ngModel)]="lng" name="lng" placeholder="Boylam (Lng)" />
            </div>
          </div>

          @if (error()) {
            <p class="err-msg">{{ error() }}</p>
          }

          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="closed.emit()">Vazgeç</button>
            <button type="submit" class="btn btn-primary" [disabled]="submitting() || !name().trim()">
              @if (submitting()) { Kaydediliyor... }
              @else { 💾 Restoranı Kaydet }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
      display: flex; align-items: flex-end; justify-content: center; z-index: 50; animation: fadeIn .2s;
    }
    .sheet {
      width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 28px 28px 0 0; padding: 24px 20px 32px; animation: slideUp .3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sheet-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .close-x {
      background: rgba(255,255,255,0.08); border: none; color: #fff; width: 34px; height: 34px;
      border-radius: 50%; font-size: 16px; cursor: pointer; display: grid; place-items: center;
      &:hover { background: rgba(255,255,255,0.18); }
    }
    h2 { font-size: 20px; font-weight: 700; margin: 0; }
    .sub { font-size: 13.5px; margin: 6px 0 16px; line-height: 1.4; }

    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .field {
      display: flex; flex-direction: column; gap: 6px;
      label { font-size: 13px; font-weight: 600; color: #ddd; }
      .req { color: var(--danger, #ff4d4f); }
      input[type="text"], input[type="number"] {
        padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);
        background: rgba(0,0,0,0.3); color: #fff; font-size: 14.5px; outline: none;
        &:focus { border-color: var(--accent); box-shadow: 0 0 0 2px hsla(22,100%,62%,0.2); }
      }
    }

    .cuisine-chips {
      display: flex; flex-wrap: wrap; gap: 6px; max-height: 140px; overflow-y: auto; padding: 2px;
      .chip {
        display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 99px;
        background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #ccc;
        font-size: 13px; cursor: pointer; transition: all .15s;
        &:hover { background: rgba(255,255,255,0.12); color: #fff; }
        &.active {
          background: linear-gradient(135deg, hsla(22,100%,62%,0.3), hsla(340,86%,60%,0.3));
          border-color: var(--accent); color: #fff; font-weight: 600;
        }
      }
    }

    .input-prefix-box {
      display: flex; align-items: center; position: relative;
      .currency-sym { position: absolute; left: 14px; color: var(--muted); font-size: 16px; pointer-events: none; }
      input { width: 100%; padding-left: 32px !important; }
    }

    .coords-box {
      padding: 12px 14px; border-radius: 14px; background: rgba(0,0,0,0.25); border: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 8px;
    }
    .coords-header {
      display: flex; align-items: center; justify-content: space-between; font-size: 12.5px;
      .btn-use-current {
        background: none; border: none; color: #70b4ff; cursor: pointer; font-size: 12px; font-weight: 600;
        text-decoration: underline;
      }
    }
    .coords-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      input {
        padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
        background: rgba(0,0,0,0.3); color: #fff; font-size: 13px;
      }
    }

    .err-msg { color: #ff6b6b; font-size: 13px; margin: 0; }

    .actions {
      display: flex; gap: 10px; margin-top: 6px;
      .btn { flex: 1; padding: 13px; border-radius: 14px; font-size: 14.5px; font-weight: 600; cursor: pointer; }
      .btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: #ccc; }
      .btn-primary { background: linear-gradient(135deg, #ff7a18, #af002d); border: none; color: #fff; }
    }
  `
})
export class AddRestaurantSheetComponent {
  private api = inject(ApiService);
  readonly fs = inject(FilterService);
  private loc = inject(LocationService);

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly name = signal('');
  readonly address = signal('');
  readonly selectedCuisines = signal<string[]>(['kebap']);
  readonly selectedMealCards = signal<string[]>(['multinet', 'setcard', 'sodexo', 'ticket']);
  readonly priceTl = signal<number | null>(300);
  readonly lat = signal<number>(this.loc.coords()?.lat ?? 39.869);
  readonly lng = signal<number>(this.loc.coords()?.lng ?? 32.748);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  toggleCuisine(code: string) {
    const list = this.selectedCuisines();
    if (list.includes(code)) {
      this.selectedCuisines.set(list.filter(c => c !== code));
    } else {
      this.selectedCuisines.set([...list, code]);
    }
  }

  toggleMealCard(code: string) {
    const list = this.selectedMealCards();
    if (list.includes(code)) {
      this.selectedMealCards.set(list.filter(c => c !== code));
    } else {
      this.selectedMealCards.set([...list, code]);
    }
  }

  useCurrentLocation() {
    const c = this.loc.coords();
    if (c) {
      this.lat.set(c.lat);
      this.lng.set(c.lng);
    }
  }

  async save() {
    const n = this.name().trim();
    if (!n) {
      this.error.set('Lütfen mekan adını girin.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      await this.api.addRestaurant({
        name: n,
        lat: this.lat(),
        lng: this.lng(),
        cuisines: this.selectedCuisines(),
        mealCards: this.selectedMealCards(),
        priceTl: this.priceTl() ?? undefined,
        address: this.address().trim() || undefined
      });
      this.saved.emit();
      this.closed.emit();
    } catch (err: any) {
      this.error.set(err?.error || 'Restoran eklenirken bir hata oluştu.');
    } finally {
      this.submitting.set(false);
    }
  }
}
