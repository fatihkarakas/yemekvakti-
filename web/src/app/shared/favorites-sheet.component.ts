import { ChangeDetectionStrategy, Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { FilterService } from '../core/filter.service';
import { ToastService } from '../core/toast.service';
import { LocationService } from '../core/location.service';
import { Candidate, Preference } from '../core/models';

@Component({
  selector: 'app-favorites-sheet',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()">
      <div class="sheet" role="dialog" aria-labelledby="fav-sheet-title" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="sheet-header">
          <div class="title-wrap">
            <h2 id="fav-sheet-title">⭐ Favori Mekanlarım</h2>
            <span class="count-badge">{{ favorites().length }} Mekan</span>
          </div>
          <button type="button" class="close-x" (click)="closed.emit()" aria-label="Kapat">✕</button>
        </div>

        <p class="muted sub">
          Favorilerini düzenle, çarkta çıkma ağırlıklarını (oranlarını) belirle. Karar çarkını sadece bu favorilerinle çevirebilirsin!
        </p>

        <!-- Arama ve Yeni Mekan Ekleme -->
        <div class="add-section glass">
          <div class="search-row">
            <input
              type="text"
              class="search-input"
              [(ngModel)]="searchQuery"
              (keyup.enter)="searchRestaurants()"
              placeholder="Listeye eklemek için mekan ara... (Örn: Kemah, Koç, Pizza)"
            />
            <button
              type="button"
              class="btn btn-sm btn-primary search-btn"
              [disabled]="searching() || !searchQuery.trim()"
              (click)="searchRestaurants()"
            >
              {{ searching() ? '...' : 'Ara 🔍' }}
            </button>
          </div>

          @if (searchResults().length > 0) {
            <div class="search-results pop-in">
              <span class="res-hint muted">Bulunan Mekanlar:</span>
              @for (c of searchResults(); track c.id) {
                <div class="result-row">
                  <div class="res-info">
                    <strong>{{ c.name }}</strong>
                    <span class="muted">{{ c.cuisineLabels || 'Restoran' }} · {{ c.distanceM }}m</span>
                  </div>
                  @if (isAlreadyFav(c.id)) {
                    <span class="added-badge">Zaten Favori ✓</span>
                  } @else {
                    <button type="button" class="btn btn-sm btn-ghost add-fav-btn" (click)="addFavorite(c)">
                      ➕ Favoriye Ekle
                    </button>
                  }
                </div>
              }
            </div>
          } @else if (hasSearched() && !searching()) {
            <div class="no-res-box pop-in">
              <span class="muted" style="font-size: 13px;">Veritabanında bulunamadı.</span>
              <button type="button" class="btn btn-sm btn-primary quick-add-btn" (click)="quickAddSearched()">
                ➕ "{{ searchQuery }}" Mekanını Kaydet ve Favoriye Ekle
              </button>
            </div>
          }
        </div>

        <!-- Favoriler Listesi -->
        <div class="fav-list-section">
          @if (loading()) {
            <div class="loading-state muted">Favoriler yükleniyor... 🔄</div>
          } @else if (favorites().length === 0) {
            <div class="empty-state glass">
              <span class="empty-icon">⭐</span>
              <h3>Henüz favori mekanın yok</h3>
              <p class="muted">Yukarıdaki arama çubuğunu kullanarak veya önerilen restoranların yanındaki 🤍 butonuna basarak favorilerini ekleyebilirsin.</p>
            </div>
          } @else {
            <div class="items-list">
              @for (f of favorites(); track f.restaurantId) {
                <div class="fav-item glass">
                  <div class="item-head">
                    <div class="item-meta">
                      <div class="emo-box">{{ getEmoji(f) }}</div>
                      <div class="titles">
                        <h4>{{ f.restaurantName }}</h4>
                        <p class="muted sub-text">{{ f.cuisineLabels || 'Restoran' }}</p>
                      </div>
                    </div>
                    <button type="button" class="del-btn" (click)="removeFavorite(f)" title="Favorilerden Çıkar">
                      🗑️
                    </button>
                  </div>

                  @if (f.address) {
                    <p class="addr-text muted">📍 {{ f.address }}</p>
                  }

                  <!-- Yemek Kartları -->
                  @if (f.mealCards && f.mealCards.length > 0) {
                    <div class="cards-row">
                      @for (card of f.mealCards; track card) {
                        <span class="meal-tag" [class]="'card-' + card">
                          {{ fs.mealCardEmoji(card) }} {{ fs.mealCardLabel(card) }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Ağırlık / Oran Ayarı -->
                  <div class="weight-control">
                    <div class="weight-label-row">
                      <span class="muted lbl">Çark Şans Oranı:</span>
                      <div class="weight-summary">
                        <strong class="weight-val">{{ f.weight }}x</strong>
                        <span class="pct-badge">(%{{ getPct(f) }} Şans)</span>
                      </div>
                    </div>
                    
                    <div class="stepper-row">
                      <button type="button" class="step-btn" [disabled]="f.weight <= 1" (click)="changeWeight(f, -1)">
                        –
                      </button>
                      <input
                        type="range"
                        class="weight-slider"
                        min="1"
                        max="10"
                        step="1"
                        [ngModel]="f.weight"
                        (ngModelChange)="setWeight(f, $event)"
                      />
                      <button type="button" class="step-btn" [disabled]="f.weight >= 10" (click)="changeWeight(f, +1)">
                        +
                      </button>
                    </div>

                    <div class="quick-weights">
                      <span class="muted small-lbl">Hızlı:</span>
                      <button type="button" class="chip-w" [class.active]="f.weight === 1" (click)="setWeight(f, 1)">1x (Normal)</button>
                      <button type="button" class="chip-w" [class.active]="f.weight === 2" (click)="setWeight(f, 2)">2x (2 Kat)</button>
                      <button type="button" class="chip-w" [class.active]="f.weight === 3" (click)="setWeight(f, 3)">3x</button>
                      <button type="button" class="chip-w" [class.active]="f.weight === 5" (click)="setWeight(f, 5)">5x (Yüksek)</button>
                    </div>
                  </div>

                </div>
              }
            </div>
          }
        </div>

        <!-- Alt Butonlar -->
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">
            Kapat
          </button>
          @if (favorites().length >= 2) {
            <button type="button" class="btn btn-primary spin-fav-btn" (click)="spinWheelWithFavorites()">
              🎡 Bu Favorilerle Çarkı Çevir!
            </button>
          }
        </div>

      </div>
    </div>
  `,
  styles: `
    .sheet-backdrop {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: flex-end; justify-content: center;
      z-index: 50;
      animation: fadeIn 0.2s;
    }
    .sheet {
      width: 100%; max-width: 580px;
      max-height: 90vh;
      overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 28px 28px 0 0;
      padding: 24px 20px 32px;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sheet-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .title-wrap {
      display: flex; align-items: center; gap: 10px;
    }
    h2 { font-size: 21px; font-weight: 700; margin: 0; }
    .count-badge {
      font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 99px;
      background: rgba(234, 179, 8, 0.2);
      border: 1px solid rgba(234, 179, 8, 0.45);
      color: #fde047;
    }
    .close-x {
      background: rgba(255, 255, 255, 0.08);
      border: none; color: #fff;
      width: 34px; height: 34px;
      border-radius: 50%; font-size: 16px;
      cursor: pointer; display: grid; place-items: center;
      &:hover { background: rgba(255, 255, 255, 0.18); }
    }
    .sub { font-size: 13.5px; margin: 6px 0 16px; line-height: 1.45; }

    /* Arama Kısmı */
    .add-section {
      padding: 12px; border-radius: 16px;
      margin-bottom: 18px;
    }
    .search-row {
      display: flex; gap: 8px;
    }
    .search-input {
      flex: 1; min-width: 0;
      padding: 10px 14px; border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.35);
      color: #fff; font-size: 13.5px;
      outline: none;
      &:focus { border-color: var(--accent); }
    }
    .search-btn { flex: none; }
    .search-results {
      margin-top: 12px; display: flex; flex-direction: column; gap: 8px;
      max-height: 180px; overflow-y: auto; padding-right: 4px;
    }
    .res-hint { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
    .result-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 8px 12px; border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
    }
    .res-info {
      flex: 1; min-width: 0; display: flex; flex-direction: column;
      strong { font-size: 13.5px; }
      span { font-size: 12px; margin-top: 1px; }
    }
    .added-badge { font-size: 12px; color: var(--success); font-weight: 600; }
    .add-fav-btn { font-size: 12px; padding: 5px 10px; }
    .no-res-box {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px dashed var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }
    .quick-add-btn {
      font-size: 12.5px;
      padding: 7px 14px;
      background: linear-gradient(135deg, #ff7a18, #af002d);
    }

    /* Liste */
    .fav-list-section {
      min-height: 120px;
    }
    .loading-state { text-align: center; padding: 30px; font-size: 14px; }
    .empty-state {
      text-align: center; padding: 28px 16px; border-radius: 18px;
      .empty-icon { font-size: 38px; display: block; margin-bottom: 8px; }
      h3 { font-size: 17px; margin-bottom: 6px; }
      p { font-size: 13px; max-width: 340px; margin: 0 auto; line-height: 1.4; }
    }
    .items-list {
      display: flex; flex-direction: column; gap: 12px;
      max-height: 48vh; overflow-y: auto; padding-right: 2px;
    }
    .fav-item {
      padding: 14px; border-radius: 16px;
      border: 1px solid var(--border);
    }
    .item-head {
      display: flex; align-items: center; justify-content: space-between;
    }
    .item-meta {
      display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
    }
    .emo-box {
      width: 40px; height: 40px; border-radius: 12px;
      display: grid; place-items: center; font-size: 22px;
      background: rgba(255, 255, 255, 0.08);
      flex: none;
    }
    .titles {
      flex: 1; min-width: 0;
      h4 { margin: 0; font-size: 15.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub-text { font-size: 12.5px; margin-top: 2px; }
    }
    .del-btn {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5; width: 34px; height: 34px;
      border-radius: 10px; font-size: 15px;
      cursor: pointer; display: grid; place-items: center;
      transition: all 0.15s;
      &:hover { background: rgba(239, 68, 68, 0.28); transform: scale(1.08); }
    }
    .addr-text { font-size: 12px; margin: 6px 0 0; }

    .cards-row {
      display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px;
    }
    .meal-tag {
      font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 6px;
      background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border);
      &.card-multinet { background: rgba(139, 92, 246, 0.18); border-color: rgba(139, 92, 246, 0.4); color: #c4b5fd; }
      &.card-setcard { background: rgba(234, 179, 8, 0.18); border-color: rgba(234, 179, 8, 0.4); color: #fde047; }
      &.card-sodexo { background: rgba(59, 130, 246, 0.18); border-color: rgba(59, 130, 246, 0.4); color: #93c5fd; }
      &.card-ticket { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
      &.card-metropol { background: rgba(34, 197, 94, 0.18); border-color: rgba(34, 197, 94, 0.4); color: #86efac; }
    }

    /* Ağırlık / Oran Bölümü */
    .weight-control {
      margin-top: 12px; padding-top: 10px;
      border-top: 1px dashed rgba(255, 255, 255, 0.12);
    }
    .weight-label-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 12.5px; margin-bottom: 6px;
    }
    .weight-summary {
      display: flex; align-items: center; gap: 6px;
      .weight-val { font-size: 14px; color: var(--accent-1); }
      .pct-badge {
        font-size: 11.5px; font-weight: 700; color: #fde047;
        background: rgba(234, 179, 8, 0.18); padding: 1px 6px; border-radius: 6px;
      }
    }
    .stepper-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .step-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border);
      color: #fff; font-size: 16px; font-weight: 700;
      cursor: pointer; display: grid; place-items: center;
      transition: all 0.15s;
      &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.2); }
      &:disabled { opacity: 0.35; cursor: default; }
    }
    .weight-slider {
      flex: 1; accent-color: var(--accent); cursor: pointer;
    }
    .quick-weights {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .small-lbl { font-size: 11px; }
    .chip-w {
      padding: 3px 8px; border-radius: 99px;
      background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border);
      color: #bbb; font-size: 11px; cursor: pointer;
      transition: all 0.15s;
      &:hover { color: #fff; background: rgba(255, 255, 255, 0.12); }
      &.active {
        background: rgba(240, 67, 122, 0.25); border-color: var(--accent);
        color: #fff; font-weight: 700;
      }
    }

    /* Actions */
    .sheet-actions {
      display: flex; gap: 10px; margin-top: 20px;
      button { flex: 1; padding: 13px; font-size: 14.5px; }
      .spin-fav-btn {
        flex: 1.5;
        background: linear-gradient(135deg, #ff7a18, #af002d);
      }
    }
  `,
})
export class FavoritesSheetComponent implements OnInit {
  protected fs = inject(FilterService);
  private api = inject(ApiService);
  private loc = inject(LocationService);
  private toast = inject(ToastService);

  readonly closed = output<void>();
  readonly favoritesUpdated = output<Preference[]>();
  readonly spinWithFavorites = output<void>();

  readonly favorites = signal<Preference[]>([]);
  readonly loading = signal(true);

  searchQuery = '';
  readonly searching = signal(false);
  readonly searchResults = signal<Candidate[]>([]);

  readonly totalWeight = computed(() => {
    return this.favorites().reduce((sum, f) => sum + Math.max(f.weight || 1, 1), 0);
  });

  async ngOnInit() {
    await this.loadFavorites();
  }

  async loadFavorites() {
    this.loading.set(true);
    try {
      const prefs = await this.api.preferences();
      const favs = prefs.filter(p => p.type === 'Favorite');
      this.favorites.set(favs);
      this.favoritesUpdated.emit(favs);
    } catch {
      this.toast.error('Favoriler yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  getPct(f: Preference): number {
    const total = this.totalWeight();
    if (total === 0) return 0;
    const w = Math.max(f.weight || 1, 1);
    return Math.round((w / total) * 100);
  }

  getEmoji(f: Preference): string {
    const code = f.cuisines?.[0];
    return code ? this.fs.emoji(code) : '🍽️';
  }

  isAlreadyFav(restId: number): boolean {
    return this.favorites().some(f => f.restaurantId === restId);
  }

  hasSearched = signal(false);

  async searchRestaurants() {
    const q = this.searchQuery.trim();
    if (!q) return;

    this.searching.set(true);
    this.hasSearched.set(true);
    try {
      const coords = await this.loc.locate();
      const res = await this.api.searchRestaurants(q, coords.lat, coords.lng);
      this.searchResults.set(res);
      if (res.length === 0) {
        this.toast.show('Bu aramayla eşleşen mekan bulunamadı. Dilerseniz hemen ekleyebilirsiniz.');
      }
    } catch {
      this.toast.error('Mekan aranırken hata oluştu.');
    } finally {
      this.searching.set(false);
    }
  }

  async quickAddSearched() {
    const q = this.searchQuery.trim();
    if (!q) return;
    try {
      const coords = await this.loc.locate();
      const isBurger = q.toLowerCase().includes('burger');
      const isPizza = q.toLowerCase().includes('pizza');
      const cuisines = isBurger ? ['burger'] : isPizza ? ['pizza'] : ['evyemegi'];
      const newId = await this.api.addRestaurant({
        name: q,
        lat: coords.lat,
        lng: coords.lng,
        cuisines,
        mealCards: ['multinet', 'setcard', 'sodexo', 'ticket'],
        priceTl: 320
      });
      await this.api.setPreference(newId, 'Favorite', 1);
      this.toast.success(`⭐ ${q} favorilerine eklendi!`);
      this.searchQuery = '';
      this.searchResults.set([]);
      this.hasSearched.set(false);
      await this.loadFavorites();
    } catch {
      this.toast.error('Mekan eklenemedi.');
    }
  }

  async addFavorite(c: Candidate) {
    try {
      await this.api.setPreference(c.id, 'Favorite', 1);
      this.toast.success(`⭐ ${c.name} favorilerine eklendi!`);
      this.searchQuery = '';
      this.searchResults.set([]);
      await this.loadFavorites();
    } catch {
      this.toast.error('Favori eklenemedi.');
    }
  }

  async removeFavorite(f: Preference) {
    try {
      await this.api.removePreference(f.restaurantId);
      this.favorites.update(list => list.filter(item => item.restaurantId !== f.restaurantId));
      this.favoritesUpdated.emit(this.favorites());
      this.toast.show(`${f.restaurantName} favorilerden çıkarıldı.`);
    } catch {
      this.toast.error('Favori silinemedi.');
    }
  }

  async changeWeight(f: Preference, delta: number) {
    const newWeight = Math.max(1, Math.min(10, (f.weight || 1) + delta));
    await this.setWeight(f, newWeight);
  }

  async setWeight(f: Preference, newWeight: number) {
    if (f.weight === newWeight) return;
    f.weight = newWeight;
    this.favorites.update(list => [...list]);
    this.favoritesUpdated.emit(this.favorites());
    try {
      await this.api.updatePreferenceWeight(f.restaurantId, newWeight);
    } catch {
      this.toast.error('Ağırlık güncellenemedi.');
    }
  }

  spinWheelWithFavorites() {
    this.spinWithFavorites.emit();
    this.closed.emit();
  }
}
