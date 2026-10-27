import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FilterService } from '../../core/filter.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Candidate, SuggestionResponse, Visit } from '../../core/models';
import { RestaurantCardComponent } from '../../shared/restaurant-card.component';
import { WheelComponent, WheelItem } from '../../shared/wheel.component';
import { CuisineSheetComponent } from '../../shared/cuisine-sheet.component';
import { RateSheetComponent } from '../../shared/rate-sheet.component';
import { burstConfetti } from '../../shared/confetti';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [
    RestaurantCardComponent,
    WheelComponent,
    CuisineSheetComponent,
    RateSheetComponent,
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
        <span class="status-pill">
          @if (loc.status() === 'locating') { 🔄 Konum alınıyor... }
          @else if (loc.status() === 'ok') { 📍 Mevcut konumun }
          @else { 📍 Yakın çevre }
        </span>
        <span class="status-pill">
          📏 {{ fs.filters().radius >= 1000 ? (fs.filters().radius / 1000).toFixed(1) + ' km' : fs.filters().radius + ' m' }}
        </span>
        @if (fs.filters().cuisines.length > 0) {
          <span class="status-pill active-tag">
            {{ fs.filters().cuisines.length }} tarz seçili
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
                  <button id="custom-cuisine-btn" type="button" class="btn btn-sm btn-ghost" (click)="showCuisineSheet.set(true)">
                    🎯 Tarz Değiştir
                  </button>
                </div>
              </div>
            </app-restaurant-card>

            <!-- Alternatifler -->
            @if (suggestion()?.alternatives?.length ?? 0; as count) {
              <div class="section-title">Diğer Yakın Alternatifler</div>
              <div class="alternatives-list">
                @for (alt of suggestion()!.alternatives; track alt.id) {
                  <div class="alt-item glass" (click)="selectAlternative(alt)">
                    <div class="alt-emo">{{ alt.cuisines[0] ? fs.emoji(alt.cuisines[0]) : '🍽️' }}</div>
                    <div class="alt-info">
                      <h4>{{ alt.name }}</h4>
                      <p class="muted">{{ alt.cuisineLabels || 'Restoran' }} · {{ alt.distanceM }}m</p>
                    </div>
                    <div class="alt-stars">
                      @if (alt.googleRating) { ⭐ {{ alt.googleRating.toFixed(1) }} }
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
          <p class="wheel-desc muted">Kararsız mısınız? Çarkı çevir, şansına nereye çıkarsa oraya git!</p>

          @if (wheelItems().length >= 2) {
            <app-wheel [items]="wheelItems()" (result)="onWheelWon($event)" (spinStart)="onSpinStart()" />
          } @else {
            <div class="empty-box glass">
              <p>Çark için yeterli restoran bulunamadı. Mesafeyi artırmayı dene!</p>
              <button type="button" class="btn btn-primary" (click)="loadCandidates()">Yeniden Ara</button>
            </div>
          }

          @if (wheelWinner(); as winner) {
            <div class="winner-reveal glass pop-in">
              <span class="winner-badge">🎉 Çarkın Kararı!</span>
              <h3>{{ winner.name }}</h3>
              <p class="muted">{{ winner.cuisineLabels }} · {{ winner.distanceM }}m</p>

              <div class="card-actions" style="margin-top: 14px;">
                <button id="accept-wheel-btn" type="button" class="btn btn-success btn-block" (click)="acceptLunch(winner, 'wheel')">
                  ✅ Karar Verildi, Gidelim!
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Bottom Sheet: Ne Tarz Yemek? -->
      @if (showCuisineSheet()) {
        <app-cuisine-sheet (closed)="showCuisineSheet.set(false)" (applied)="onFiltersApplied()" />
      }

      <!-- Bottom Sheet: Ziyareti Puanla & Not Al -->
      @if (activeRateVisit(); as v) {
        <app-rate-sheet [visit]="v" (closed)="activeRateVisit.set(null)" (saved)="onVisitRated($event)" />
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
      transition: background .2s;
      &:hover { background: rgba(255,255,255,0.08); }
    }
    .alt-emo { font-size: 24px; }
    .alt-info { flex: 1; h4 { font-size: 15.5px; } p { font-size: 12.5px; margin-top: 2px; } }
    .alt-stars { font-size: 13px; font-weight: 600; color: var(--star); }
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
  readonly wheelItems = signal<WheelItem[]>([]);
  readonly wheelWinner = signal<Candidate | null>(null);

  readonly showCuisineSheet = signal(false);
  readonly activeRateVisit = signal<Visit | null>(null);

  async ngOnInit() {
    await this.fs.load();
    await this.loadSuggestion();
  }

  setMode(m: 'suggest' | 'wheel') {
    this.mode.set(m);
    if (m === 'wheel' && this.wheelItems().length === 0) {
      this.loadCandidates();
    }
  }

  hasActiveFilters() {
    return this.fs.filters().cuisines.length > 0 || this.fs.filters().maxPrice !== null;
  }

  filterCount() {
    let c = this.fs.filters().cuisines.length;
    if (this.fs.filters().maxPrice) c++;
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
        radius: currentFilters.radius,
        cuisines: currentFilters.cuisines,
        maxPrice: currentFilters.maxPrice,
        avoidDays: currentFilters.avoidDays,
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
        radius: currentFilters.radius,
        cuisines: currentFilters.cuisines,
        maxPrice: currentFilters.maxPrice,
        avoidDays: currentFilters.avoidDays,
        limit: 10
      });
      this.candidates.set(list);
      this.wheelItems.set(list.map(c => ({
        id: c.id,
        label: c.name,
        emoji: c.cuisines?.[0] ? this.fs.emoji(c.cuisines[0]) : '🍽️'
      })));
    } catch {
      this.toast.error('Restoranlar listelenemedi.');
    }
  }

  onSpinStart() {
    this.wheelWinner.set(null);
  }

  onWheelWon(item: WheelItem) {
    const winner = this.candidates().find(c => c.id === item.id) ?? null;
    this.wheelWinner.set(winner);
    burstConfetti(80);
    this.toast.success(`Çark kararını verdi: ${item.label}! 🎡🎉`);
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
      this.loadCandidates();
    }
  }

  resetFiltersAndRetry() {
    this.fs.set({ cuisines: [], maxPrice: null, radius: 2500 });
    this.loadSuggestion();
  }

  onVisitRated(updatedVisit: Visit) {
    this.activeRateVisit.set(null);
    this.toast.success('Puan ve notun kaydedildi! ⭐');
  }
}
