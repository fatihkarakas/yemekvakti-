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

      @if (reason()) {
        <p class="reason">
          @if (ai()) { <span class="ai">✨ Gemini</span> }
          {{ reason() }}
        </p>
      }

      <div class="meta">
        <span class="tag">📍 {{ distance() }}</span>
        @if (r().googleRating) { <span class="tag">⭐ {{ r().googleRating?.toFixed(1) }} Google</span> }
        @if (r().priceLevel) { <span class="tag">{{ '₺'.repeat(r().priceLevel!) }}</span> }
        @if (r().myVisitCount > 0) { <span class="tag">🔁 {{ r().myVisitCount }} kez gittin</span> }
        @else { <span class="tag new">🆕 Hiç gitmedin</span> }
      </div>

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
    .reason {
      margin-top: 16px; padding: 12px 14px; border-radius: 14px;
      background: rgba(255,255,255,0.05); font-size: 15.5px; line-height: 1.45;
    }
    .ai {
      display: inline-block; margin-right: 6px; padding: 2px 8px; border-radius: 99px;
      font-size: 11.5px; font-weight: 700; letter-spacing: .03em;
      background: linear-gradient(135deg, #4f8bff, #a855f7); color: #fff; vertical-align: 1px;
    }
    .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
    .tag.new { color: var(--success); }
    .mine { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
    .note { margin-top: 8px; font-size: 14px; color: var(--muted); font-style: italic; }
  `,
})
export class RestaurantCardComponent {
  private fs = inject(FilterService);
  readonly r = input.required<Candidate>();
  readonly reason = input<string | null>(null);
  readonly ai = input(false);

  readonly emoji = computed(() => (this.r().cuisines[0] ? this.fs.emoji(this.r().cuisines[0]) : '🍽️'));
  readonly distance = computed(() => {
    const m = this.r().distanceM;
    const walk = Math.max(1, Math.round(m / 80));
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km · ${walk} dk` : `${m} m · ${walk} dk`;
  });
}
