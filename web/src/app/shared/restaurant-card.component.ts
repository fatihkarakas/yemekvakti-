import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Candidate } from '../core/models';
import { FilterService } from '../core/filter.service';
import { StarsComponent } from './stars.component';

/** Öneri / çark sonucu restoran kartı. */
@Component({
  selector: 'app-restaurant-card',
  imports: [StarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card glass pop-in">
      <div class="hero">
        <div class="emoji-badge">{{ emoji() }}</div>
        <div class="titles">
          <h2>{{ r().name }}</h2>
          <p class="muted">{{ r().cuisineLabels || 'Restoran' }}</p>
        </div>
        @if (r().isFavorite) { <span class="fav" title="Favori">💛</span> }
      </div>

      <!-- Açık Adres ve Yol Tarifi Butonu -->
      <div class="location-banner">
        <div class="address-text">
          <span class="addr-label muted">Adres:</span>
          <p class="addr-val">{{ r().address || r().name + ' (Yakın çevre)' }}</p>
        </div>
        <a [href]="directionsUrl()" target="_blank" rel="noopener" class="direction-btn" title="Haritada Aç ve Yol Tarifi Başlat">
          🧭 <span>Yol Tarifi</span>
          <span class="arrow">↗</span>
        </a>
      </div>

      @if (reason()) {
        <p class="reason">
          @if (ai()) { <span class="ai">✨ Gemini</span> }
          {{ reason() }}
        </p>
      }

      <div class="meta">
        <span class="tag">📍 {{ distance() }}</span>
        @if (r().priceTl) { <span class="tag price-tag">💳 ~{{ r().priceTl }} ₺/kişi</span> }
        @else if (r().priceLevel) { <span class="tag">{{ '₺'.repeat(r().priceLevel!) }}</span> }
        @if (r().googleRating) { <span class="tag">⭐ {{ r().googleRating?.toFixed(1) }} Google</span> }
        @if (r().myVisitCount > 0) { <span class="tag">🔁 {{ r().myVisitCount }} kez gittin</span> }
        @else { <span class="tag new">🆕 Hiç gitmedin</span> }
      </div>

      <!-- Yemek Kartı Rozetleri -->
      @if (r().mealCards && r().mealCards.length > 0) {
        <div class="meal-cards-row">
          <span class="meal-cards-title muted">Yemek Kartı:</span>
          @for (card of r().mealCards; track card) {
            <span class="meal-badge" [class]="'card-' + card">
              {{ fs.mealCardEmoji(card) }} {{ fs.mealCardLabel(card) }}
            </span>
          }
        </div>
      }

      @if (r().myRating) {
        <div class="mine">
          <span class="muted">Senin puanın</span>
          <app-stars [value]="r().myRating" [size]="16" />
          <strong>{{ r().myRating }}</strong>
        </div>
      }
      @if (r().lastNote) {
        <p class="note">📝 “{{ r().lastNote }}”</p>
      }

      <ng-content />
    </article>
  `,
  styles: `
    .card { padding: 20px; position: relative; overflow: hidden; }
    .card::before {
      content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--accent);
    }
    .hero { display: flex; gap: 14px; align-items: center; }
    .emoji-badge {
      flex: none; width: 60px; height: 60px; border-radius: 18px;
      display: grid; place-items: center; font-size: 32px;
      background: linear-gradient(135deg, hsla(22,100%,62%,0.25), hsla(340,86%,60%,0.25));
      border: 1px solid var(--border);
      animation: float 3.5s ease-in-out infinite;
    }
    .titles { flex: 1; min-width: 0; }
    h2 { font-size: 23px; overflow-wrap: anywhere; }
    .titles p { font-size: 14px; margin-top: 3px; }
    .fav { font-size: 22px; }

    /* Adres & Yol Tarifi Çubuğu */
    .location-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 14px;
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
    }
    .address-text {
      flex: 1;
      min-width: 0;
      .addr-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
      .addr-val { font-size: 13.5px; color: #fff; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }
    .direction-btn {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, hsla(210, 100%, 56%, 0.25), hsla(260, 90%, 60%, 0.25));
      border: 1px solid hsla(210, 100%, 60%, 0.5);
      color: #70b4ff;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all .2s;
      &:hover {
        background: hsla(210, 100%, 56%, 0.4);
        color: #fff;
        transform: translateY(-1px);
      }
      .arrow { font-size: 14px; }
    }

    .reason {
      margin-top: 14px; padding: 12px 14px; border-radius: 14px;
      background: rgba(255,255,255,0.05); font-size: 15.5px; line-height: 1.45;
    }
    .ai {
      display: inline-block; margin-right: 6px; padding: 2px 8px; border-radius: 99px;
      font-size: 11.5px; font-weight: 700; letter-spacing: .03em;
      background: linear-gradient(135deg, #4f8bff, #a855f7); color: #fff; vertical-align: 1px;
    }
    .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
    .price-tag { color: var(--warn); background: hsla(44, 100%, 60%, 0.12); border-color: hsla(44, 100%, 60%, 0.3); font-weight: 600; }
    .tag.new { color: var(--success); }
    .mine { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
    .note { margin-top: 8px; font-size: 14px; color: var(--muted); font-style: italic; }

    .meal-cards-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px;
    }
    .meal-cards-title { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; margin-right: 2px; }
    .meal-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px;
      font-size: 11.5px; font-weight: 600; background: rgba(255,255,255,0.06); border: 1px solid var(--border);
      color: #e2e8f0;
      &.card-multinet { background: rgba(139, 92, 246, 0.18); border-color: rgba(139, 92, 246, 0.45); color: #c4b5fd; }
      &.card-setcard { background: rgba(234, 179, 8, 0.18); border-color: rgba(234, 179, 8, 0.45); color: #fde047; }
      &.card-sodexo { background: rgba(59, 130, 246, 0.18); border-color: rgba(59, 130, 246, 0.45); color: #93c5fd; }
      &.card-ticket { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.45); color: #fca5a5; }
      &.card-metropol { background: rgba(34, 197, 94, 0.18); border-color: rgba(34, 197, 94, 0.45); color: #86efac; }
    }
  `,
})
export class RestaurantCardComponent {
  protected fs = inject(FilterService);
  readonly r = input.required<Candidate>();
  readonly reason = input<string | null>(null);
  readonly ai = input(false);

  readonly emoji = computed(() => (this.r().cuisines[0] ? this.fs.emoji(this.r().cuisines[0]) : '🍽️'));
  readonly distance = computed(() => {
    const m = this.r().distanceM;
    if (m >= 1000) {
      const km = (m / 1000).toFixed(1);
      const car = Math.max(2, Math.round(m / 500));
      return `${km} km · ~${car} dk araç`;
    }
    const walk = Math.max(1, Math.round(m / 80));
    return `${m} m · ~${walk} dk yürüme`;
  });

  readonly directionsUrl = computed(() => {
    const c = this.r();
    // Google Maps Navigation & Directions URL
    return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  });
}
