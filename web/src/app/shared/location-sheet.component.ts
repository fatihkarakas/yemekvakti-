import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AddressResult, LocationService } from '../core/location.service';
import { ToastService } from '../core/toast.service';
import { FormsModule } from '@angular/forms';

interface QuickCity {
  city: string;
  districts: { name: string; query: string; lat: number; lng: number }[];
}

const POPULAR_LOCATIONS: QuickCity[] = [
  {
    city: 'İstanbul',
    districts: [
      { name: 'Kadıköy (Moda)', query: 'Kadıköy Moda İstanbul', lat: 40.9856, lng: 29.0278 },
      { name: 'Beşiktaş (Çarşı)', query: 'Beşiktaş Çarşı İstanbul', lat: 41.0428, lng: 29.0069 },
      { name: 'Levent / Maslak', query: 'Levent Beşiktaş İstanbul', lat: 41.0814, lng: 29.0093 },
      { name: 'Şişli (Mecidiyeköy)', query: 'Mecidiyeköy Şişli İstanbul', lat: 41.0664, lng: 28.9934 },
      { name: 'Üsküdar', query: 'Üsküdar İstanbul', lat: 41.0267, lng: 29.0152 },
      { name: 'Bakırköy', query: 'Bakırköy İstanbul', lat: 40.9780, lng: 28.8725 },
    ]
  },
  {
    city: 'Ankara',
    districts: [
      { name: 'Çankaya (Kızılay)', query: 'Kızılay Çankaya Ankara', lat: 39.9208, lng: 32.8541 },
      { name: 'Tunalı Hilmi', query: 'Tunalı Hilmi Çankaya Ankara', lat: 39.9042, lng: 32.8606 },
      { name: 'Çukurambar', query: 'Çukurambar Çankaya Ankara', lat: 39.9022, lng: 32.8089 },
      { name: 'Yenimahalle (Batıkent)', query: 'Batıkent Yenimahalle Ankara', lat: 39.9723, lng: 32.7489 },
    ]
  },
  {
    city: 'İzmir',
    districts: [
      { name: 'Alsancak (Konak)', query: 'Alsancak Konak İzmir', lat: 38.4377, lng: 27.1428 },
      { name: 'Karşıyaka', query: 'Karşıyaka İzmir', lat: 38.4594, lng: 27.1106 },
      { name: 'Bornova', query: 'Bornova İzmir', lat: 38.4697, lng: 27.2186 },
    ]
  }
];

@Component({
  selector: 'app-location-sheet',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="closed.emit()">
      <div class="sheet location-sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="loc-title">
        <h2 id="loc-title">📍 Konumunu Belirle</h2>
        <p class="muted sub">Öğle yemeği arayacağımız mahalle veya adresi seçin.</p>

        <!-- Arama Çubuğu -->
        <div class="search-box">
          <input id="address-search-input" type="text" class="input" [(ngModel)]="searchQuery"
                 placeholder="İl, ilçe veya mahalle ara... (Örn: Kadıköy Moda, Batıkent)"
                 (keyup.enter)="search()" />
          <button id="address-search-btn" type="button" class="btn btn-primary btn-sm" [disabled]="searching() || !searchQuery.trim()" (click)="search()">
            {{ searching() ? '...' : 'Ara 🔍' }}
          </button>
        </div>

        <!-- Arama Sonuçları -->
        @if (searchResults().length > 0) {
          <div class="results-list pop-in">
            <span class="section-tag">Arama Sonuçları:</span>
            @for (res of searchResults(); track res.label) {
              <button type="button" class="result-item glass" (click)="selectResult(res)">
                <span class="pin">📍</span>
                <span class="text">{{ res.label }}</span>
              </button>
            }
          </div>
        }

        <!-- GPS Butonu -->
        <div class="gps-wrap">
          <button id="use-gps-btn" type="button" class="btn btn-ghost btn-block" (click)="useGps()">
            🎯 Cihazımın GPS Konumunu Kullan (Otomatik)
          </button>
        </div>

        <!-- Popüler Hızlı Seçimler -->
        <div class="popular-section">
          <span class="section-tag">Hızlı Semt Seçimi:</span>
          @for (group of popular; track group.city) {
            <div class="city-group">
              <span class="city-title muted">{{ group.city }}:</span>
              <div class="districts-chips">
                @for (d of group.districts; track d.name) {
                  <button type="button" class="chip" (click)="selectQuick(group.city, d.name, d.lat, d.lng)">
                    {{ d.name }}
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <div class="sheet-close">
          <button id="loc-close-btn" type="button" class="btn btn-sm btn-ghost" (click)="closed.emit()">Kapat</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .location-sheet { max-height: 90dvh; }
    h2 { font-size: 22px; }
    .sub { font-size: 13.5px; margin: 4px 0 16px; }
    .search-box {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      max-height: 200px;
      overflow-y: auto;
    }
    .result-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      text-align: left;
      cursor: pointer;
      border-radius: 14px;
      color: var(--text);
      font-size: 13.5px;
      border: 1px solid var(--border);
      background: var(--surface);
      &:hover { background: rgba(255, 255, 255, 0.12); }
      .pin { font-size: 16px; }
      .text { flex: 1; }
    }
    .gps-wrap {
      margin-bottom: 16px;
      button { border: 1px dashed var(--border); }
    }
    .section-tag {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 8px;
    }
    .city-group {
      margin-bottom: 12px;
    }
    .city-title {
      font-size: 12.5px;
      display: block;
      margin-bottom: 6px;
    }
    .districts-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .sheet-close {
      margin-top: 14px;
      text-align: center;
    }
  `
})
export class LocationSheetComponent {
  private loc = inject(LocationService);
  private toast = inject(ToastService);

  readonly closed = output<void>();
  readonly selected = output<void>();

  readonly popular = POPULAR_LOCATIONS;
  readonly searchResults = signal<AddressResult[]>([]);
  readonly searching = signal(false);

  searchQuery = '';

  async search() {
    if (!this.searchQuery.trim()) return;
    this.searching.set(true);
    try {
      const results = await this.loc.searchAddress(this.searchQuery.trim());
      this.searchResults.set(results);
      if (results.length === 0) {
        this.toast.show('Bu isimde bir adres bulunamadı, farklı yazmayı deneyin.');
      }
    } catch {
      this.toast.error('Adres aranamadı.');
    } finally {
      this.searching.set(false);
    }
  }

  selectResult(r: AddressResult) {
    this.loc.setManualLocation({ lat: r.lat, lng: r.lng }, r.label);
    this.toast.success(`Konum seçildi: ${r.label} 📍`);
    this.selected.emit();
    this.closed.emit();
  }

  selectQuick(city: string, districtName: string, lat: number, lng: number) {
    const label = `${districtName}, ${city}`;
    this.loc.setManualLocation({ lat, lng }, label);
    this.toast.success(`Konum seçildi: ${label} 📍`);
    this.selected.emit();
    this.closed.emit();
  }

  async useGps() {
    this.toast.show('GPS konumu alınıyor... 🔄');
    await this.loc.useGps();
    this.toast.success('Mevcut GPS konumun aktif edildi! 📍');
    this.selected.emit();
    this.closed.emit();
  }
}
