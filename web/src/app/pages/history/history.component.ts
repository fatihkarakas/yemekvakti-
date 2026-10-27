import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { HistoryStats, Visit } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { StarsComponent } from '../../shared/stars.component';
import { RateSheetComponent } from '../../shared/rate-sheet.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-history',
  imports: [StarsComponent, RateSheetComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page history-page">
      <header class="header">
        <div>
          <p class="muted">Nerede ne yemiştin?</p>
          <h1>Öğle Yemeği <span class="gradient-text">Geçmişin</span></h1>
        </div>
      </header>

      <!-- İstatistik Kartları -->
      @if (stats(); as s) {
        <div class="stats-grid">
          <div class="stat-card glass">
            <span class="num">{{ s.totalVisits }}</span>
            <span class="lbl muted">Toplam Yemek</span>
          </div>
          <div class="stat-card glass" [class.highlight]="s.unrated > 0">
            <span class="num">{{ s.unrated }}</span>
            <span class="lbl muted">Puan Bekleyen</span>
          </div>
          <div class="stat-card glass">
            <span class="num">{{ s.averageStars ? s.averageStars.toFixed(1) : '-' }} ⭐</span>
            <span class="lbl muted">Ortalama Puan</span>
          </div>
        </div>

        @if (s.topRestaurant) {
          <div class="top-spot glass pop-in">
            <span class="spot-badge">🏆 En Çok Tercih Edilen</span>
            <strong>{{ s.topRestaurant }}</strong>
            <span class="muted">({{ s.topRestaurantCount }} kez gidildi)</span>
          </div>
        }
      }

      <!-- Puan Bekleyenler Uyarısı -->
      @if (unratedVisits().length > 0) {
        <div class="unrated-banner glass pop-in">
          <div>
            <strong>{{ unratedVisits().length }} yemek henüz puanlanmadı!</strong>
            <p class="muted">Daha iyi öneriler sunabilmemiz için deneyimini puanla.</p>
          </div>
          <button type="button" class="btn btn-sm btn-primary" (click)="editVisit(unratedVisits()[0])">
            Puanla ⭐
          </button>
        </div>
      }

      <!-- Ziyaret Listesi -->
      <div class="section-title">Tüm Ziyaretler</div>

      @if (loading()) {
        <div class="loading-state glass">Yükleniyor...</div>
      } @else if (visits().length === 0) {
        <div class="empty-state glass">
          <p class="big-emo">🥗</p>
          <h3>Henüz geçmişin boş</h3>
          <p class="muted">Ana sayfadan bir restoran önerisi kabul ettiğinde veya çarkı çevirdiğinde burada listelenecek.</p>
        </div>
      } @else {
        <div class="visits-timeline">
          @for (v of visits(); track v.id) {
            <article class="visit-card glass pop-in" (click)="editVisit(v)">
              <div class="visit-head">
                <div>
                  <h3 class="place-name">{{ v.restaurantName }}</h3>
                  <p class="muted sub">
                    {{ v.visitedAt | date:'d MMMM y, EEEE HH:mm':'':'tr' }} ·
                    <span class="source-tag">{{ v.source === 'wheel' ? '🎡 Çark' : '✨ Öneri' }}</span>
                  </p>
                </div>
                <button type="button" class="rate-btn" (click)="$event.stopPropagation(); editVisit(v)">
                  @if (v.stars) {
                    <div class="rated-stars">
                      <app-stars [value]="v.stars" [size]="16" />
                      <strong>{{ v.stars }}</strong>
                    </div>
                  } @else {
                    <span class="pending-chip">⭐ Puan Ver</span>
                  }
                </button>
              </div>

              @if (v.note) {
                <div class="visit-note">
                  📝 “{{ v.note }}”
                </div>
              }

              <div class="visit-foot">
                <span class="muted meta-info">{{ v.cuisineLabels }}</span>
                @if (v.mapsUrl) {
                  <a [href]="v.mapsUrl" target="_blank" rel="noopener" class="maps-link" (click)="$event.stopPropagation()">
                    📍 Haritada Aç
                  </a>
                }
              </div>
            </article>
          }
        </div>
      }

      <!-- Puanlama Bottom Sheet -->
      @if (selectedVisit(); as v) {
        <app-rate-sheet [visit]="v" (closed)="selectedVisit.set(null)" (saved)="onSaved($event)" />
      }
    </main>
  `,
  styles: `
    .history-page { padding-bottom: 120px; }
    .header { margin-bottom: 20px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .stat-card {
      padding: 14px 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      .num { font-size: 22px; font-weight: 800; color: #fff; }
      .lbl { font-size: 11.5px; }
      &.highlight {
        border-color: hsla(44, 100%, 60%, 0.4);
        background: hsla(44, 100%, 60%, 0.08);
        .num { color: var(--warn); }
      }
    }
    .top-spot {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      margin-bottom: 14px;
      font-size: 13.5px;
      flex-wrap: wrap;
    }
    .spot-badge {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--accent-1);
      background: hsla(22, 100%, 62%, 0.15);
      padding: 2px 8px;
      border-radius: 999px;
    }
    .unrated-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      margin-bottom: 20px;
      background: linear-gradient(135deg, hsla(45, 100%, 60%, 0.12), hsla(22, 100%, 62%, 0.12));
      border-color: hsla(45, 100%, 60%, 0.4);
      strong { font-size: 14px; color: #fff; display: block; }
      p { font-size: 12.5px; margin-top: 2px; }
    }
    .visits-timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .visit-card {
      padding: 16px;
      cursor: pointer;
      border-radius: 20px;
      transition: background .2s;
      &:hover { background: rgba(255, 255, 255, 0.08); }
    }
    .visit-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .place-name { font-size: 17px; margin-bottom: 3px; }
    .sub { font-size: 12.5px; }
    .source-tag { font-size: 11.5px; }
    .rate-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .rated-stars {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .pending-chip {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: var(--star);
      background: hsla(45, 100%, 60%, 0.15);
      border: 1px solid hsla(45, 100%, 60%, 0.35);
      padding: 4px 10px;
      border-radius: 999px;
    }
    .visit-note {
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      font-size: 13.5px;
      color: #dfdbe8;
      font-style: italic;
    }
    .visit-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      font-size: 12px;
    }
    .maps-link {
      color: var(--accent-1);
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }
    .empty-state {
      padding: 44px 20px;
      text-align: center;
      .big-emo { font-size: 48px; margin-bottom: 12px; }
      h3 { font-size: 18px; margin-bottom: 6px; }
      p { font-size: 13.5px; }
    }
    .loading-state {
      padding: 30px;
      text-align: center;
      color: var(--muted);
    }
  `
})
export class HistoryComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly visits = signal<Visit[]>([]);
  readonly stats = signal<HistoryStats | null>(null);
  readonly loading = signal(false);
  readonly selectedVisit = signal<Visit | null>(null);

  readonly unratedVisits = signal<Visit[]>([]);

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const [list, s] = await Promise.all([
        this.api.visits(),
        this.api.stats()
      ]);
      this.visits.set(list);
      this.stats.set(s);
      this.unratedVisits.set(list.filter(v => v.stars === null));
    } catch {
      this.toast.error('Geçmiş yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  editVisit(v: Visit) {
    this.selectedVisit.set(v);
  }

  onSaved(updated: Visit) {
    this.selectedVisit.set(null);
    this.visits.update(items => items.map(x => x.id === updated.id ? updated : x));
    this.unratedVisits.update(items => items.filter(x => x.id !== updated.id));
    this.api.stats().then(s => this.stats.set(s));
  }
}
