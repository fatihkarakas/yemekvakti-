import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FilterService } from '../../core/filter.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Candidate, Preference, SuggestionResponse, Visit } from '../../core/models';
import { RestaurantCardComponent } from '../../shared/restaurant-card.component';
import { WheelComponent, WheelItem } from '../../shared/wheel.component';
import { CuisineSheetComponent } from '../../shared/cuisine-sheet.component';
import { RateSheetComponent } from '../../shared/rate-sheet.component';
import { LocationSheetComponent } from '../../shared/location-sheet.component';
import { AddRestaurantSheetComponent } from '../../shared/add-restaurant-sheet.component';
import { FavoritesSheetComponent } from '../../shared/favorites-sheet.component';
import { burstConfetti } from '../../shared/confetti';

@Component({
  selector: 'app-home',
  imports: [
    RestaurantCardComponent,
    WheelComponent,
    CuisineSheetComponent,
    RateSheetComponent,
    LocationSheetComponent,
    AddRestaurantSheetComponent,
    FavoritesSheetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page home-page">
      <!-- Üst Başlık & Kullanıcı -->
      <header class="header">
        <div>
          <p class="greeting muted">Bugün ne yesek, {{ auth.firstName() || 'Dostum' }}? 🍱</p>
          <h1>Yemek<span class="gradient-text">Vakti</span></h1>
        </div>
        <div class="header-actions">
          <button id="favs-btn" type="button" class="btn btn-sm btn-ghost fav-head-btn" (click)="showFavoritesSheet.set(true)" title="Favori Mekanlarım & Çark Oranları">
            ⭐ Favorilerim @if (favorites().length > 0) { ({{ favorites().length }}) }
          </button>
          <button id="sanayi-head-btn" type="button" class="btn btn-sm btn-ghost sanayi-head-btn" (click)="spinWithSanayi()" title="Sanayi Lezzetleri Çarkı">
            🔧 Sanayi Lezzetleri
          </button>
          <button id="add-restaurant-btn" type="button" class="btn btn-sm btn-ghost add-btn" (click)="showAddSheet.set(true)" title="Yeni Restoran / Mekan Ekle">
            ➕ Mekan Ekle
          </button>
          <button id="filter-btn" type="button" class="btn btn-sm" [class.btn-primary]="hasActiveFilters()" (click)="showCuisineSheet.set(true)">
            🎯 Filtrele @if (hasActiveFilters()) { ({{ filterCount() }}) }
          </button>
        </div>
      </header>

      <!-- Mod Değiştirici: Öneri vs Çark -->
      <div class="mode-switch-wrap">
        <div class="mode-switch">
          <button id="mode-suggest-btn" type="button" [class.active]="mode() === 'suggest'" (click)="setMode('suggest')">
            ✨ Akıllı Öneri
          </button>
          <button id="mode-wheel-btn" type="button" [class.active]="mode() === 'wheel'" (click)="setMode('wheel')">
            🎡 Karar Çarkı
          </button>
        </div>
      </div>

      <!-- Konum & Filtre Özeti -->
      <div class="status-bar">
        <button id="change-location-btn" type="button" class="status-pill loc-pill" (click)="showLocationSheet.set(true)">
          <span class="loc-text">📍 {{ loc.addressLabel() }}</span>
          <span class="edit-hint">✏️</span>
        </button>
        <span class="status-pill">
          📏 {{ fs.filters().radius >= 1000 ? (fs.filters().radius / 1000).toFixed(1) + ' km' : fs.filters().radius + ' m' }}
        </span>
        @if (fs.filters().cuisines.length > 0) {
          <span class="status-pill active-tag">
            {{ fs.filters().cuisines.length }} tarz seçili
          </span>
        }
        @if (fs.filters().mealCards.length > 0) {
          <span class="status-pill active-tag">
            💳 {{ fs.filters().mealCards.length }} kart filtreli
          </span>
        }
      </div>

      <!-- ================= MOD 1: AKILLI ÖNERİ ================= -->
      @if (mode() === 'suggest') {
        @if (loading()) {
          <div class="loading-box glass">
            <div class="spinner">🍳</div>
            <p>Gemini en lezzetli seçeneği düşünüyor...</p>
          </div>
        } @else if (suggestion()?.restaurant; as r) {
          <div class="suggestion-area">
            <app-restaurant-card [r]="r" [reason]="suggestion()?.reason ?? null" [ai]="suggestion()?.aiUsed ?? false">
              <div class="card-actions">
                <button id="accept-lunch-btn" type="button" class="btn btn-success btn-block" (click)="acceptLunch(r)">
                  ✅ Harika, Buraya Gidelim!
                </button>
                <div class="sub-actions">
                  <button id="next-suggestion-btn" type="button" class="btn btn-sm" (click)="loadSuggestion(true)">
                    🔄 Başka Öner
                  </button>
                  <button id="sanayi-wheel-cta" type="button" class="btn btn-sm btn-ghost sanayi-cta-btn" (click)="spinWithSanayi()">
                    🔧 Sanayi Çarkı
                  </button>
                  <button id="custom-cuisine-btn" type="button" class="btn btn-sm btn-ghost" (click)="showCuisineSheet.set(true)">
                    🎯 Tarz Değiştir
                  </button>
                </div>
              </div>
            </app-restaurant-card>

            <!-- Alternatifler (Lokasyona En Uygun 15 Restoran) -->
            @if (suggestion()?.alternatives?.length ?? 0; as count) {
              <div class="alternatives-header">
                <div>
                  <h3 class="section-title">📍 Çevrendeki En Uygun Restoranlar</h3>
                  <p class="muted sub-note">5 km yarıçapta lokasyonuna en yakın mekanlar arasından seçilen alternatifler:</p>
                </div>
                <span class="alt-count-badge">{{ count + 1 }} Mekan</span>
              </div>
              <div class="alternatives-list">
                @for (alt of suggestion()!.alternatives; track alt.id; let idx = $index) {
                  <div class="alt-item glass" (click)="selectAlternative(alt)" title="Bu mekanı seçmek için tıkla">
                    <div class="alt-rank">#{{ idx + 2 }}</div>
                    <div class="alt-emo">{{ alt.cuisines[0] ? fs.emoji(alt.cuisines[0]) : '🍽️' }}</div>
                    <div class="alt-info">
                      <h4>{{ alt.name }}</h4>
                      <p class="muted">{{ alt.cuisineLabels || 'Restoran' }} · 🚶 {{ alt.distanceM >= 1000 ? (alt.distanceM / 1000).toFixed(1) + 'km' : alt.distanceM + 'm' }} @if (alt.priceTl) { · ₺{{ alt.priceTl }} }</p>
                    </div>
                    <div class="alt-meta">
                      @if (alt.googleRating) {
                        <span class="alt-stars">⭐ {{ alt.googleRating.toFixed(1) }}</span>
                      }
                      <span class="alt-pick-btn">Seç ➔</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty-box glass">
            <p>Seçtiğin kriterlere uyan restoran bulunamadı 😕</p>
            <button type="button" class="btn btn-primary" (click)="resetFiltersAndRetry()">Filtreleri Sıfırla ve Yenile</button>
          </div>
        }
      }

      <!-- ================= MOD 2: DÖNEN KARAR ÇARKI ================= -->
      @if (mode() === 'wheel') {
        <div class="wheel-area">
          
          <!-- Çark Kaynak Seçimi (Yakındakiler vs Sanayi vs Favorilerim) -->
          <div class="wheel-source-toggle">
            <button
              id="wheel-source-candidates-btn"
              type="button"
              class="source-tab"
              [class.active]="wheelSource() === 'candidates'"
              (click)="setWheelSource('candidates')"
            >
              📍 Yakındakiler ({{ candidates().length }})
            </button>
            <button
              id="wheel-source-sanayi-btn"
              type="button"
              class="source-tab sanayi-tab"
              [class.active]="wheelSource() === 'sanayi'"
              (click)="setWheelSource('sanayi')"
            >
              🔧 Sanayi Lezzetleri @if (sanayiCandidates().length > 0) { ({{ sanayiCandidates().length }}) }
            </button>
            <button
              id="wheel-source-favs-btn"
              type="button"
              class="source-tab fav-tab"
              [class.active]="wheelSource() === 'favorites'"
              (click)="setWheelSource('favorites')"
            >
              ⭐ Favorilerim ({{ favorites().length }})
            </button>
          </div>

          @if (wheelSource() === 'favorites') {
            <div class="fav-wheel-bar glass pop-in">
              <span class="fav-bar-text">
                🎯 Çark, favorilerine belirlediğin <strong>özel oranlara</strong> göre döner!
              </span>
              <button type="button" class="btn btn-sm btn-ghost edit-fav-link" (click)="showFavoritesSheet.set(true)">
                ⚙️ Oranları Düzenle
              </button>
            </div>
          } @else if (wheelSource() === 'sanayi') {
            <div class="sanayi-wheel-bar glass pop-in">
              <span class="sanayi-bar-text">
                🔧 Çevrendeki <strong>sanayi siteleri, esnaf lokantaları, köfteciler ve kavurmacılar</strong> çarka dahil edildi!
              </span>
              <button type="button" class="btn btn-sm btn-ghost edit-fav-link" (click)="loadSanayiCandidates(true)">
                🔄 Yenile
              </button>
            </div>
          } @else {
            <p class="wheel-desc muted">Kararsız mısınız? Çarkı çevir, şansına nereye çıkarsa oraya git!</p>
          }

          @if (wheelItems().length >= 2) {
            <app-wheel [items]="wheelItems()" (result)="onWheelWon($event)" (spinStart)="onSpinStart()" />
          } @else {
            <div class="empty-box glass">
              @if (wheelSource() === 'favorites') {
                <span class="empty-fav-icon">⭐</span>
                <p>Çarkı çevirmek için en az 2 favori mekana ihtiyacın var.</p>
                <button type="button" class="btn btn-primary" (click)="showFavoritesSheet.set(true)">
                  ⭐ Favori Mekan Ekle & Oran Belirle
                </button>
              } @else if (wheelSource() === 'sanayi') {
                <span class="empty-fav-icon">🔧</span>
                <p>Çevrede sanayi lezzeti taranıyor veya bulunamadı.</p>
                <button type="button" class="btn btn-primary" (click)="loadSanayiCandidates(true)">
                  🔧 Sanayi Lezzetlerini Ara
                </button>
              } @else {
                <p>Çark için yeterli restoran bulunamadı. Mesafeyi artırmayı dene!</p>
                <button type="button" class="btn btn-primary" (click)="loadCandidates()">Yeniden Ara</button>
              }
            </div>
          }

          @if (wheelWinner(); as winner) {
            <div class="winner-reveal glass pop-in">
              <span class="winner-badge">🎉 Çarkın Kararı!</span>
              <h3>{{ winner.name }}</h3>
              <p class="muted">{{ winner.cuisineLabels }} · {{ winner.distanceM > 0 ? winner.distanceM + 'm' : (winner.address || 'Favori Mekanın') }}</p>

              <div class="card-actions" style="margin-top: 14px;">
                <button id="accept-wheel-btn" type="button" class="btn btn-success btn-block" (click)="acceptLunch(winner, 'wheel')">
                  ✅ Karar Verildi, Gidelim!
                </button>
                <a [href]="getDirectionsUrl(winner)"
                   target="_blank" rel="noopener" class="btn btn-sm btn-ghost">
                  🧭 Haritada Yol Tarifi Al ↗
                </a>
              </div>
            </div>
          }
        </div>
      }

      <!-- Bottom Sheet: Ne Tarz Yemek? -->
      @if (showCuisineSheet()) {
        <app-cuisine-sheet (closed)="showCuisineSheet.set(false)" (applied)="onFiltersApplied()" />
      }

      <!-- Bottom Sheet: Konum / Adres Seçimi -->
      @if (showLocationSheet()) {
        <app-location-sheet (closed)="showLocationSheet.set(false)" (selected)="onLocationChanged()" />
      }

      <!-- Bottom Sheet: Ziyareti Puanla & Not Al -->
      @if (activeRateVisit(); as v) {
        <app-rate-sheet [visit]="v" (closed)="activeRateVisit.set(null)" (saved)="onVisitRated($event)" />
      }

      <!-- Bottom Sheet: Yeni Mekan Ekle -->
      @if (showAddSheet()) {
        <app-add-restaurant-sheet (closed)="showAddSheet.set(false)" (saved)="onRestaurantAdded()" />
      }

      <!-- Bottom Sheet: Favoriler & Çark Oranları -->
      @if (showFavoritesSheet()) {
        <app-favorites-sheet
          (closed)="showFavoritesSheet.set(false)"
          (favoritesUpdated)="onFavoritesUpdated($event)"
          (spinWithFavorites)="spinWithFavorites()"
        />
      }
    </main>
  `,
  styles: `
    .home-page { padding-bottom: 120px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .greeting { font-size: 13.5px; margin-bottom: 2px; }
    .mode-switch-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .mode-switch {
      display: flex;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px;
      gap: 4px;
    }
    .mode-switch button {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 14px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 999px;
      cursor: pointer;
      transition: all .2s;
    }
    .mode-switch button.active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 4px 14px -3px hsla(340, 86%, 60%, 0.6);
    }
    .status-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin-bottom: 18px;
      padding-bottom: 4px;
    }
    .status-pill {
      font-size: 12.5px;
      padding: 5px 12px;
      border-radius: 999px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--muted);
      white-space: nowrap;
    }
    .loc-pill {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all .2s;
      color: var(--text);
      border-color: hsla(22, 100%, 62%, 0.4);
      background: hsla(22, 100%, 62%, 0.1);
      &:hover { background: hsla(22, 100%, 62%, 0.18); }
      &:active { transform: scale(0.96); }
      .loc-text { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
      .edit-hint { font-size: 11px; }
    }
    .active-tag {
      background: hsla(22, 100%, 62%, 0.15);
      border-color: hsla(22, 100%, 62%, 0.4);
      color: var(--accent-1);
    }
    .loading-box {
      padding: 48px 24px;
      text-align: center;
      .spinner {
        font-size: 48px;
        animation: float 2s infinite ease-in-out;
        margin-bottom: 14px;
      }
      p { color: var(--muted); font-size: 15px; }
    }
    .card-actions {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sub-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .alternatives-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 24px;
      margin-bottom: 12px;
      .section-title { font-size: 16px; font-weight: 700; margin: 0; }
      .sub-note { font-size: 12px; margin: 3px 0 0; }
    }
    .alt-count-badge {
      font-size: 12px; font-weight: 700; color: #ff7a18;
      background: rgba(255,122,24,0.12); border: 1px solid rgba(255,122,24,0.25);
      padding: 4px 10px; border-radius: 99px;
    }
    .alternatives-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .alt-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      cursor: pointer;
      border-radius: 16px;
      transition: all .2s;
      &:hover { background: rgba(255,255,255,0.08); transform: translateY(-1px); }
    }
    .alt-rank {
      font-size: 12.5px; font-weight: 700; color: var(--muted); min-width: 24px; text-align: center;
    }
    .alt-emo { font-size: 24px; }
    .alt-info { flex: 1; h4 { font-size: 15.5px; margin: 0; } p { font-size: 12px; margin-top: 3px; } }
    .alt-meta {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
    }
    .alt-stars { font-size: 13px; font-weight: 600; color: var(--star); }
    .alt-pick-btn {
      font-size: 11px; font-weight: 600; color: #ff7a18;
      background: rgba(255,122,24,0.12); padding: 2px 8px; border-radius: 6px;
    }
    .wheel-area {
      text-align: center;
    }
    .wheel-desc { font-size: 14px; margin-bottom: 22px; }
    .winner-reveal {
      margin-top: 24px;
      padding: 18px;
      text-align: center;
      h3 { font-size: 22px; margin-top: 8px; }
    }
    .winner-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: var(--success);
      background: hsla(158, 68%, 50%, 0.15);
      border: 1px solid hsla(158, 68%, 50%, 0.3);
      padding: 3px 10px;
      border-radius: 999px;
    }
    .fav-head-btn {
      border-color: rgba(234, 179, 8, 0.45);
      color: #fde047;
      &:hover { background: rgba(234, 179, 8, 0.15); }
    }
    .sanayi-head-btn {
      border-color: rgba(249, 115, 22, 0.45);
      color: #fb923c;
      &:hover { background: rgba(249, 115, 22, 0.15); }
    }
    .sanayi-cta-btn {
      border-color: rgba(249, 115, 22, 0.4);
      color: #fb923c;
      &:hover { background: rgba(249, 115, 22, 0.12); }
    }
    .wheel-source-toggle {
      display: inline-flex;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px;
      gap: 4px;
      margin-bottom: 14px;
    }
    .source-tab {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      padding: 7px 16px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s;
      &.active {
        background: var(--accent);
        color: #fff;
        box-shadow: 0 4px 14px -3px rgba(241, 65, 124, 0.6);
      }
      &.fav-tab.active {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        box-shadow: 0 4px 14px -3px rgba(245, 158, 11, 0.6);
      }
      &.sanayi-tab.active {
        background: linear-gradient(135deg, #ea580c, #c2410c);
        box-shadow: 0 4px 14px -3px rgba(234, 88, 12, 0.6);
      }
    }
    .fav-wheel-bar {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 999px;
      margin-bottom: 18px;
      font-size: 13px;
      border: 1px solid rgba(234, 179, 8, 0.3);
      background: rgba(234, 179, 8, 0.1);
    }
    .sanayi-wheel-bar {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 999px;
      margin-bottom: 18px;
      font-size: 13px;
      border: 1px solid rgba(249, 115, 22, 0.3);
      background: rgba(249, 115, 22, 0.1);
    }
    .fav-bar-text { color: #fde047; font-size: 12.5px; }
    .sanayi-bar-text { color: #fdba74; font-size: 12.5px; }
    .edit-fav-link {
      font-size: 12px;
      padding: 4px 10px;
      color: #fde047;
      text-decoration: underline;
    }
    .empty-fav-icon {
      font-size: 38px;
      display: block;
      margin-bottom: 8px;
    }
    .empty-box {
      padding: 36px 20px;
      text-align: center;
      p { margin-bottom: 16px; }
    }
  `
})
export class HomeComponent implements OnInit {
  protected api = inject(ApiService);
  protected auth = inject(AuthService);
  protected fs = inject(FilterService);
  protected loc = inject(LocationService);
  private toast = inject(ToastService);

  readonly mode = signal<'suggest' | 'wheel'>('suggest');
  readonly loading = signal(false);
  readonly suggestion = signal<SuggestionResponse | null>(null);
  readonly candidates = signal<Candidate[]>([]);
  readonly sanayiCandidates = signal<Candidate[]>([]);
  readonly favorites = signal<Preference[]>([]);
  readonly wheelItems = signal<WheelItem[]>([]);
  readonly wheelWinner = signal<Candidate | null>(null);
  readonly wheelSource = signal<'candidates' | 'favorites' | 'sanayi'>('candidates');

  readonly showCuisineSheet = signal(false);
  readonly showLocationSheet = signal(false);
  readonly showAddSheet = signal(false);
  readonly showFavoritesSheet = signal(false);
  readonly activeRateVisit = signal<Visit | null>(null);

  async ngOnInit() {
    await this.fs.load();
    await Promise.all([this.loadSuggestion(), this.loadFavorites()]);
  }

  async loadFavorites() {
    try {
      const prefs = await this.api.preferences();
      const favs = prefs.filter(p => p.type === 'Favorite');
      this.favorites.set(favs);
      if (this.wheelSource() === 'favorites') {
        this.updateWheelItemsFromFavorites();
      }
    } catch {}
  }

  setWheelSource(source: 'candidates' | 'favorites' | 'sanayi') {
    this.wheelSource.set(source);
    this.wheelWinner.set(null);
    if (source === 'candidates') {
      if (this.candidates().length === 0) {
        this.loadCandidates();
      } else {
        this.wheelItems.set(this.candidates().map(c => ({
          id: c.id,
          label: c.name,
          emoji: c.cuisines?.[0] ? this.fs.emoji(c.cuisines[0]) : '🍽️'
        })));
      }
    } else if (source === 'sanayi') {
      if (this.sanayiCandidates().length === 0) {
        this.loadSanayiCandidates();
      } else {
        this.updateWheelItemsFromSanayi();
      }
    } else {
      this.updateWheelItemsFromFavorites();
    }
  }

  updateWheelItemsFromFavorites() {
    const favs = this.favorites();
    this.wheelItems.set(favs.map(f => ({
      id: f.restaurantId,
      label: f.restaurantName,
      emoji: f.cuisines?.[0] ? this.fs.emoji(f.cuisines[0]) : '🍽️',
      weight: Math.max(f.weight || 1, 1)
    })));
  }

  updateWheelItemsFromSanayi() {
    const list = this.sanayiCandidates();
    this.wheelItems.set(list.map(c => ({
      id: c.id,
      label: c.name,
      emoji: c.cuisines?.[0] ? this.fs.emoji(c.cuisines[0]) : '🔧'
    })));
  }

  onFavoritesUpdated(favs: Preference[]) {
    this.favorites.set(favs);
    if (this.wheelSource() === 'favorites') {
      this.updateWheelItemsFromFavorites();
    }
  }

  spinWithFavorites() {
    this.setMode('wheel');
    this.setWheelSource('favorites');
  }

  spinWithSanayi() {
    this.setMode('wheel');
    this.setWheelSource('sanayi');
  }

  onLocationChanged() {
    this.showLocationSheet.set(false);
    if (this.mode() === 'suggest') {
      this.loadSuggestion();
    } else {
      if (this.wheelSource() === 'candidates') {
        this.loadCandidates();
      } else if (this.wheelSource() === 'sanayi') {
        this.loadSanayiCandidates(true);
      }
    }
  }

  onRestaurantAdded() {
    this.toast.show('Mekan başarıyla eklendi! Listeye dahil edildi.', 'success');
    if (this.mode() === 'suggest') {
      this.loadSuggestion();
    } else {
      if (this.wheelSource() === 'candidates') {
        this.loadCandidates();
      } else if (this.wheelSource() === 'sanayi') {
        this.loadSanayiCandidates(true);
      }
    }
  }

  setMode(m: 'suggest' | 'wheel') {
    this.mode.set(m);
    if (m === 'wheel') {
      if (this.wheelSource() === 'favorites') {
        this.updateWheelItemsFromFavorites();
      } else if (this.wheelSource() === 'sanayi') {
        if (this.sanayiCandidates().length === 0) {
          this.loadSanayiCandidates();
        } else {
          this.updateWheelItemsFromSanayi();
        }
      } else if (this.wheelItems().length === 0) {
        this.loadCandidates();
      }
    }
  }

  hasActiveFilters() {
    const f = this.fs.filters();
    return (f.cuisines?.length ?? 0) > 0 || (f.mealCards?.length ?? 0) > 0 || f.minPriceTl !== null || f.maxPriceTl !== null || f.maxPrice !== null;
  }

  filterCount() {
    const f = this.fs.filters();
    let c = (f.cuisines?.length ?? 0) + (f.mealCards?.length ?? 0);
    if (f.minPriceTl !== null || f.maxPriceTl !== null || f.maxPrice !== null) c++;
    return c;
  }

  async loadSuggestion(forceNext = false) {
    this.loading.set(true);
    try {
      const coords = await this.loc.locate();
      const currentFilters = this.fs.filters();
      const excludeIds = forceNext && this.suggestion()?.restaurant?.id ? [this.suggestion()!.restaurant!.id] : [];

      const res = await this.api.suggest({
        lat: coords.lat,
        lng: coords.lng,
        radius: currentFilters.radius || 5000,
        cuisines: currentFilters.cuisines,
        mealCards: currentFilters.mealCards,
        minPriceTl: currentFilters.minPriceTl,
        maxPriceTl: currentFilters.maxPriceTl,
        maxPrice: currentFilters.maxPrice,
        avoidDays: currentFilters.avoidDays,
        limit: 15,
        excludeIds
      });

      this.suggestion.set(res);
      if (res.restaurant) {
        burstConfetti(25);
      }
    } catch {
      this.toast.error('Öneriler yüklenirken bir problem oluştu.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadCandidates() {
    const coords = await this.loc.locate();
    const currentFilters = this.fs.filters();
    try {
      const list = await this.api.candidates({
        lat: coords.lat,
        lng: coords.lng,
        radius: currentFilters.radius || 5000,
        cuisines: currentFilters.cuisines,
        mealCards: currentFilters.mealCards,
        minPriceTl: currentFilters.minPriceTl,
        maxPriceTl: currentFilters.maxPriceTl,
        maxPrice: currentFilters.maxPrice,
        avoidDays: currentFilters.avoidDays,
        limit: 15
      });
      this.candidates.set(list);
      if (this.wheelSource() === 'candidates') {
        this.wheelItems.set(list.map(c => ({
          id: c.id,
          label: c.name,
          emoji: c.cuisines?.[0] ? this.fs.emoji(c.cuisines[0]) : '🍽️'
        })));
      }
    } catch {
      this.toast.error('Restoranlar listelenemedi.');
    }
  }

  async loadSanayiCandidates(force = false) {
    if (!force && this.sanayiCandidates().length > 0) {
      this.updateWheelItemsFromSanayi();
      return;
    }
    const coords = await this.loc.locate();
    try {
      const list = await this.api.candidates({
        lat: coords.lat,
        lng: coords.lng,
        radius: 8500,
        sanayiOnly: true,
        limit: 20
      });
      this.sanayiCandidates.set(list);
      if (this.wheelSource() === 'sanayi') {
        this.updateWheelItemsFromSanayi();
      }
    } catch {
      this.toast.error('Sanayi lezzetleri listelenemedi.');
    }
  }

  onSpinStart() {
    this.wheelWinner.set(null);
  }

  onWheelWon(item: WheelItem) {
    let winner: Candidate | null = null;
    if (this.wheelSource() === 'favorites') {
      const fav = this.favorites().find(f => f.restaurantId === item.id);
      if (fav) {
        winner = {
          id: fav.restaurantId,
          name: fav.restaurantName,
          address: fav.address ?? '',
          cuisines: fav.cuisines ?? [],
          cuisineLabels: fav.cuisineLabels ?? 'Restoran',
          mealCards: fav.mealCards ?? [],
          mealCardLabels: fav.mealCardLabels ?? [],
          priceTl: fav.priceTl ?? null,
          priceLevel: null,
          googleRating: fav.googleRating ?? null,
          googleRatingCount: null,
          distanceM: 0,
          lat: fav.lat ?? 0,
          lng: fav.lng ?? 0,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${fav.lat},${fav.lng}`,
          myRating: null,
          myVisitCount: 0,
          lastVisitAt: null,
          lastNote: null,
          isFavorite: true,
          score: 5
        };
      }
    } else if (this.wheelSource() === 'sanayi') {
      winner = this.sanayiCandidates().find(c => c.id === item.id) ?? null;
    } else {
      winner = this.candidates().find(c => c.id === item.id) ?? null;
    }

    this.wheelWinner.set(winner);
    burstConfetti(80);
    this.toast.success(`Çark kararını verdi: ${item.label}! 🎡🎉`);
  }

  getDirectionsUrl(c: Candidate | null): string {
    if (!c) return '#';
    const dest = (c.address && c.address.trim()) ? `${c.name}, ${c.address.trim()}` : `${c.lat},${c.lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  }

  async acceptLunch(r: Candidate, source: 'suggestion' | 'wheel' = 'suggestion') {
    try {
      const logId = source === 'suggestion' ? this.suggestion()?.suggestionLogId : null;
      const visit = await this.api.createVisit(r.id, source, logId);
      burstConfetti(60);
      this.toast.success(`Afiyet olsun! ${r.name} kaydedildi 🍽️`);
      // Ziyaret sonrası puanlama / not sheet'i göster
      setTimeout(() => {
        this.activeRateVisit.set(visit);
      }, 700);
    } catch {
      this.toast.error('Kayıt yapılamadı.');
    }
  }

  selectAlternative(alt: Candidate) {
    this.suggestion.update(curr => curr ? { ...curr, restaurant: alt, reason: 'Alternatiflerden seçildi 🎯' } : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFiltersApplied() {
    this.showCuisineSheet.set(false);
    if (this.mode() === 'suggest') {
      this.loadSuggestion();
    } else {
      if (this.wheelSource() === 'candidates') {
        this.loadCandidates();
      }
    }
  }

  resetFiltersAndRetry() {
    this.fs.set({ cuisines: [], maxPrice: null, radius: 5000 });
    this.loadSuggestion();
  }

  onVisitRated(updatedVisit: Visit) {
    this.activeRateVisit.set(null);
    this.toast.success('Puan ve notun kaydedildi! ⭐');
  }
}
