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
        <!-- Beyaz Yakalı Öğle Yemeği Karar Asistanı (Sen + Arkadaşın + Şans) -->
        <section class="ai-assistant-card glass">
          <div class="ai-head">
            <div class="ai-title-row">
              <span class="ai-badge">🤖 AI Karar Koçu</span>
              <h2>Öğlen Nereye Gidiyoruz?</h2>
            </div>
            <p class="muted ai-sub">
              Aklından geçeni yaz, arkadaşının farklı isteğini ekle ortak noktayı bulalım; ya da hiç karar yoksa işi şansa bırak!
            </p>
          </div>

          <div class="ai-inputs">
            <!-- 1. Senin Aklından Geçen -->
            <div class="ai-field">
              <label for="user-craving-input">💭 Senin aklından ne geçiyor?</label>
              <div class="ai-input-wrap">
                <input
                  id="user-craving-input"
                  type="text"
                  [value]="userPrompt()"
                  (input)="userPrompt.set($any($event.target).value)"
                  (keydown.enter)="applyAiDecision()"
                  placeholder="Örn: Canım iyi bir döner, sulu yemek veya çorba çekiyor..."
                />
                @if (userPrompt()) {
                  <button type="button" class="clear-inline-btn" (click)="userPrompt.set('')" title="Temizle">✕</button>
                }
              </div>
              <div class="quick-chips">
                <button type="button" class="q-chip" [class.active]="userPrompt().includes('döner')" (click)="setQuickUserPrompt('İyi bir döner veya kebap gömelim')">🥙 Döner / Kebap</button>
                <button type="button" class="q-chip" [class.active]="userPrompt().includes('sulu')" (click)="setQuickUserPrompt('Sıcak çorba ve sulu ev yemeği olsun')">🍲 Sulu Ev Yemeği</button>
                <button type="button" class="q-chip" [class.active]="userPrompt().includes('hafif')" (click)="setQuickUserPrompt('Bugün hafif, sağlıklı salata veya ızgara tavuk olsun')">🥗 Hafif & Sağlıklı</button>
                <button type="button" class="q-chip" [class.active]="userPrompt().includes('pide')" (click)="setQuickUserPrompt('Çıtır pide veya lahmacun çekiyor canım')">🫓 Pide / Lahmacun</button>
                <button type="button" class="q-chip" [class.active]="userPrompt().includes('burger')" (click)="setQuickUserPrompt('Güzel bir burger veya sokak lezzeti olsun')">🍔 Burger</button>
              </div>
            </div>

            <!-- 2. Arkadaşının / Ekibin İsteği (Toggle veya Açık) -->
            @if (!showFriendInput() && !friendPrompt()) {
              <button id="add-friend-thought-btn" type="button" class="friend-toggle-btn" (click)="showFriendInput.set(true)">
                🤝 Arkadaşın farklı bir şey mi istiyor? <span>+ Onun da fikrini ekle, uzlaştıralım</span>
              </button>
            } @else {
              <div class="ai-field friend-field pop-in">
                <div class="friend-label-row">
                  <label for="friend-craving-input">👥 Arkadaşının / ekibin aklında ne var?</label>
                  <button type="button" class="remove-friend-btn" (click)="clearFriendPrompt()">Kaldır ✕</button>
                </div>
                <div class="ai-input-wrap">
                  <input
                    id="friend-craving-input"
                    type="text"
                    [value]="friendPrompt()"
                    (input)="friendPrompt.set($any($event.target).value)"
                    (keydown.enter)="applyAiDecision()"
                    placeholder="Örn: O hafif salata/tavuk istiyor, ya da sulu ev yemeği diyor..."
                  />
                </div>
                <div class="quick-chips">
                  <button type="button" class="q-chip" [class.active]="friendPrompt().includes('hafif')" (click)="friendPrompt.set('O hafif bir şey, salata veya zeytinyağlı istiyor')">🥗 O hafif/salata diyor</button>
                  <button type="button" class="q-chip" [class.active]="friendPrompt().includes('ev yemeği')" (click)="friendPrompt.set('O çorba veya sulu ev yemeği istiyor')">🍲 O ev yemeği/çorba diyor</button>
                  <button type="button" class="q-chip" [class.active]="friendPrompt().includes('kebap')" (click)="friendPrompt.set('O et, kebap veya döner yemek istiyor')">🥙 O kebap/döner diyor</button>
                  <button type="button" class="q-chip" [class.active]="friendPrompt().includes('tavuk')" (click)="friendPrompt.set('O tavuk veya ızgara köfte istiyor')">🍗 O tavuk/köfte diyor</button>
                </div>
              </div>
            }

            <!-- 3. Beyaz Yakalı Öğle Molası Modu -->
            <div class="mood-row">
              <span class="mood-label">Öğle Molası Modu:</span>
              <div class="mood-pills">
                <button type="button" class="mood-pill" [class.active]="selectedMood() === 'hizli'" (click)="toggleMood('hizli')">
                  ⚡ Hızlı & Yakın (Toplantı Var)
                </button>
                <button type="button" class="mood-pill" [class.active]="selectedMood() === 'ekonomik'" (click)="toggleMood('ekonomik')">
                  💳 Ekonomik / Kart Geçsin
                </button>
                <button type="button" class="mood-pill" [class.active]="selectedMood() === 'ortak'" (click)="toggleMood('ortak')">
                  🤝 Ekipçe Herkese Uysun
                </button>
                <button type="button" class="mood-pill" [class.active]="selectedMood() === 'hafif'" (click)="toggleMood('hafif')">
                  🌿 Ağırlık Çökmesin
                </button>
                <button type="button" class="mood-pill" [class.active]="selectedMood() === 'doyurucu'" (click)="toggleMood('doyurucu')">
                  🔥 Sağlam Doyursun
                </button>
              </div>
            </div>
          </div>

          <!-- 4. Karar Aksiyonları: AI Önerisi vs Tamamen Şansa Bırak -->
          <div class="ai-actions">
            <button id="ai-decide-btn" type="button" class="btn btn-primary ai-submit-btn" [disabled]="loading()" (click)="applyAiDecision()">
              @if (userPrompt() && friendPrompt()) {
                🤝 İkimizi Uzlaştır & Ortak Mekan Bul
              } @else if (userPrompt() || friendPrompt() || selectedMood()) {
                ✨ Aklımdakine Göre En İyi Yeri Bul
              } @else {
                ✨ Yapay Zeka ile Öğle Yemeği Öner
              }
            </button>
            <button id="ai-chance-btn" type="button" class="btn chance-btn" [disabled]="loading()" (click)="leaveItToChance()" title="Hiç fikriniz yoksa şansınıza güvenin!">
              🎲 Karar Yok, Şansa Bırak!
            </button>
          </div>
        </section>

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
    .ai-assistant-card {
      padding: 18px;
      margin-bottom: 18px;
      border-radius: 20px;
      border: 1px solid rgba(255, 122, 24, 0.25);
      background: linear-gradient(155deg, rgba(255, 122, 24, 0.09), rgba(241, 65, 124, 0.06), rgba(255, 255, 255, 0.03));
    }
    .ai-head {
      margin-bottom: 14px;
    }
    .ai-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      h2 { font-size: 18px; font-weight: 700; margin: 0; }
    }
    .ai-badge {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      box-shadow: 0 4px 12px -2px rgba(241, 65, 124, 0.5);
    }
    .ai-sub {
      font-size: 12.5px;
      margin: 5px 0 0;
      line-height: 1.4;
    }
    .ai-inputs {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ai-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
    }
    .ai-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      input {
        width: 100%;
        padding: 10px 34px 10px 14px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: rgba(18, 15, 26, 0.65);
        color: var(--text);
        font-size: 13.5px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        &:focus {
          border-color: var(--accent-1);
          box-shadow: 0 0 0 3px rgba(255, 122, 24, 0.15);
        }
      }
    }
    .clear-inline-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 13px;
      padding: 4px 6px;
      &:hover { color: var(--text); }
    }
    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }
    .q-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 11.5px;
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.18s;
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text);
      }
      &.active {
        background: rgba(255, 122, 24, 0.18);
        border-color: rgba(255, 122, 24, 0.5);
        color: #ffb074;
        font-weight: 600;
      }
    }
    .friend-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      padding: 9px 14px;
      border-radius: 12px;
      border: 1px dashed rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      span {
        font-size: 12px;
        font-weight: 500;
        color: var(--accent-1);
      }
      &:hover {
        border-color: var(--accent-1);
        background: rgba(255, 122, 24, 0.08);
      }
    }
    .friend-field {
      padding: 12px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .friend-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .remove-friend-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 11.5px;
      cursor: pointer;
      &:hover { color: var(--danger); }
    }
    .mood-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 2px;
    }
    .mood-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
    }
    .mood-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mood-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 12px;
      font-weight: 500;
      padding: 5px 11px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.18s;
      &:hover { background: rgba(255, 255, 255, 0.11); }
      &.active {
        background: var(--accent);
        border-color: transparent;
        color: #fff;
        font-weight: 600;
        box-shadow: 0 3px 10px -2px rgba(241, 65, 124, 0.5);
      }
    }
    .ai-actions {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 10px;
      margin-top: 14px;
      @media (max-width: 560px) {
        grid-template-columns: 1fr;
      }
    }
    .ai-submit-btn {
      font-weight: 700;
      padding: 11px 16px;
    }
    .chance-btn {
      background: rgba(139, 92, 246, 0.16);
      border: 1px solid rgba(139, 92, 246, 0.45);
      color: #ddd6fe;
      font-weight: 700;
      padding: 11px 14px;
      &:hover {
        background: rgba(139, 92, 246, 0.28);
      }
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

  readonly userPrompt = signal('');
  readonly friendPrompt = signal('');
  readonly showFriendInput = signal(false);
  readonly selectedMood = signal<string | null>(null);

  readonly showCuisineSheet = signal(false);
  readonly showLocationSheet = signal(false);
  readonly showAddSheet = signal(false);
  readonly showFavoritesSheet = signal(false);
  readonly activeRateVisit = signal<Visit | null>(null);
  private seenSuggestionIds: number[] = [];

  setQuickUserPrompt(text: string) {
    if (this.userPrompt() === text) {
      this.userPrompt.set('');
    } else {
      this.userPrompt.set(text);
    }
  }

  clearFriendPrompt() {
    this.friendPrompt.set('');
    this.showFriendInput.set(false);
  }

  toggleMood(mood: string) {
    this.selectedMood.set(this.selectedMood() === mood ? null : mood);
  }

  applyAiDecision() {
    this.seenSuggestionIds = [];
    this.loadSuggestion(false, false);
  }

  leaveItToChance() {
    this.seenSuggestionIds = [];
    this.loadSuggestion(true, true);
  }

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
    this.seenSuggestionIds = [];
    this.sanayiCandidates.set([]);
    this.candidates.set([]);
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

  async loadSuggestion(forceNext = false, surpriseMe = false) {
    this.loading.set(true);
    try {
      const coords = await this.loc.locate();
      const currentFilters = this.fs.filters();
      if (!forceNext) {
        this.seenSuggestionIds = [];
      } else if (this.suggestion()?.restaurant?.id) {
        const curId = this.suggestion()!.restaurant!.id;
        if (!this.seenSuggestionIds.includes(curId)) {
          this.seenSuggestionIds.push(curId);
        }
        if (this.seenSuggestionIds.length > 8) {
          this.seenSuggestionIds.shift();
        }
      }
      const excludeIds = forceNext ? [...this.seenSuggestionIds] : [];

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
        excludeIds,
        userPrompt: this.userPrompt().trim() || null,
        friendPrompt: this.friendPrompt().trim() || null,
        mood: surpriseMe ? 'sans' : this.selectedMood(),
        surpriseMe
      });

      this.suggestion.set(res);
      if (res.restaurant) {
        burstConfetti(surpriseMe ? 65 : 25);
        if (surpriseMe) {
          this.toast.success(`🎲 Şans zarları atıldı: ${res.restaurant.name}!`);
        }
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
        limit: 15,
        userPrompt: this.userPrompt().trim() || null,
        friendPrompt: this.friendPrompt().trim() || null,
        mood: this.selectedMood()
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
    if (c.address && c.address.trim()) {
      const dest = `${c.name}, ${c.address.trim()}`;
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    }
    if (c.lat && c.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.name || '')}`;
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
    this.seenSuggestionIds = [];
    if (this.mode() === 'suggest') {
      this.loadSuggestion();
    } else {
      if (this.wheelSource() === 'candidates') {
        this.loadCandidates();
      }
    }
  }

  resetFiltersAndRetry() {
    this.seenSuggestionIds = [];
    this.userPrompt.set('');
    this.friendPrompt.set('');
    this.showFriendInput.set(false);
    this.selectedMood.set(null);
    this.fs.set({ cuisines: [], mealCards: [], minPriceTl: null, maxPriceTl: null, maxPrice: null, radius: 5000 });
    this.loadSuggestion();
  }

  onVisitRated(updatedVisit: Visit) {
    this.activeRateVisit.set(null);
    this.toast.success('Puan ve notun kaydedildi! ⭐');
  }
}
