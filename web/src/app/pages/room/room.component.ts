import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Candidate, Room, RoomOption } from '../../core/models';
import { WheelComponent, WheelItem } from '../../shared/wheel.component';
import { burstConfetti } from '../../shared/confetti';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-room',
  imports: [FormsModule, WheelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page room-page">
      <header class="header">
        <div>
          <p class="muted">Birlikte Karar Verin</p>
          <h1>Ekip <span class="gradient-text">Oylaması</span> 👥</h1>
        </div>
      </header>

      <!-- ODA BULUNMUYORSA: ODA OLUŞTUR VEYA KATIL -->
      @if (!currentRoom()) {
        <div class="lobby-grid">
          <!-- Odaya Katıl Kartı -->
          <div class="join-card glass pop-in">
            <h3>Mevcut Bir Odaya Katıl</h3>
            <p class="muted sub">Arkadaşının paylaştığı 5 haneli oda kodunu gir.</p>
            <div class="join-input-row">
              <input type="text" class="input code-input" [(ngModel)]="joinCode" placeholder="Örn: ABC12" maxlength="8" (keyup.enter)="joinRoom()" />
              <button type="button" class="btn btn-primary" [disabled]="!joinCode.trim() || loading()" (click)="joinRoom()">
                Katıl 🚀
              </button>
            </div>
          </div>

          <!-- Yeni Oda Aç Kartı -->
          <div class="create-card glass pop-in">
            <h3>Yeni Oylama Odası Aç</h3>
            <p class="muted sub">Yakındaki mekanları seç, linki ekibe gönder, çoğunluk karar versin!</p>

            <div class="form-group">
              <label for="room-title">Oylama Başlığı</label>
              <input id="room-title" type="text" class="input" [(ngModel)]="roomTitle" placeholder="Örn: Bugünkü Ekip Yemeği" />
            </div>

            <div class="form-group">
              <label>Oylanacak Mekanları Seç (En az 2)</label>
              <div class="candidates-selection">
                @for (c of availableCandidates(); track c.id) {
                  <button type="button" class="opt-chip" [class.selected]="selectedRestaurantIds().includes(c.id)" (click)="toggleCandidate(c.id)">
                    <span>{{ (c.cuisines || [])[0] ? '🍲' : '🍽️' }}</span>
                    <span>{{ c.name }}</span>
                    <span class="muted dist">({{ c.distanceM }}m)</span>
                  </button>
                }
              </div>
            </div>

            <button type="button" class="btn btn-success btn-block" [disabled]="selectedRestaurantIds().length < 2 || loading()" (click)="createRoom()">
              {{ loading() ? 'Oda Hazırlanıyor...' : 'Odayı Başlat & Link Al 🔗' }}
            </button>
          </div>
        </div>
      }

      <!-- AKTİF ODA GÖRÜNÜMÜ -->
      @if (currentRoom(); as r) {
        <div class="active-room-area pop-in">
          <!-- Oda Başlığı & Paylaşım Paneli -->
          <div class="room-hero glass">
            <div class="hero-top">
              <div>
                <h2>{{ r.title }}</h2>
                <p class="muted">Oda Kodu: <strong class="code-badge">{{ r.code }}</strong> · Toplam {{ r.totalVotes }} Oy</p>
              </div>
              @if (!r.isClosed && isCreator()) {
                <button type="button" class="btn btn-sm btn-ghost close-btn" (click)="closeRoom()">
                  Oylamayı Kapat
                </button>
              }
            </div>

            <div class="share-row">
              <button type="button" class="btn btn-sm" (click)="copyShareLink()">
                📋 Oylama Linkini Kopyala
              </button>
              <button type="button" class="btn btn-sm" (click)="refreshRoom()">
                🔄 Oyları Yenile
              </button>
              @if (!r.isClosed && r.options.length >= 2) {
                <button type="button" class="btn btn-sm btn-primary" (click)="showWheelModal.set(!showWheelModal())">
                  🎡 Çarkla Seç
                </button>
              }
            </div>
          </div>

          <!-- Kazanan Belli Olduysa -->
          @if (r.isClosed && r.winningRestaurantName) {
            <div class="winner-box glass pop-in">
              <span class="winner-tag">🏆 Oylama Tamamlandı! Kazanan:</span>
              <h3>{{ r.winningRestaurantName }}</h3>
              <p class="muted">Ekip kararını verdi, afiyet olsun!</p>
            </div>
          }

          <!-- Çark Modalı (Ekip Oylaması İçin) -->
          @if (showWheelModal()) {
            <div class="wheel-modal glass pop-in">
              <h3>🎡 Ekip Çarkı</h3>
              <p class="muted sub">En çok oy alan mekanlar arasında kaderinizi çark belirlesin!</p>
              <app-wheel [items]="roomWheelItems()" (result)="onWheelWon($event)" />
            </div>
          }

          <!-- Seçenekler & Oy Listesi -->
          <div class="section-title">Seçenekler ve Oylar</div>
          <div class="options-list">
            @for (opt of r.options; track opt.id) {
              <div class="option-card glass" [class.voted]="r.myVotedOptionId === opt.id" [class.winner]="r.winningRestaurantId === opt.restaurantId">
                <div class="opt-head">
                  <div>
                    <h4>{{ opt.restaurantName }}</h4>
                    <p class="muted opt-sub">{{ opt.cuisineLabels }}</p>
                  </div>
                  <div class="vote-badge">
                    <span class="count">{{ opt.voteCount }}</span>
                    <span class="lbl">oy</span>
                  </div>
                </div>

                <!-- Oy Verenler -->
                @if (opt.voters.length > 0) {
                  <div class="voters-tags">
                    @for (v of opt.voters; track v) {
                      <span class="voter-pill">👤 {{ v }}</span>
                    }
                  </div>
                }

                @if (!r.isClosed) {
                  <div class="opt-action">
                    <button type="button" class="btn btn-sm btn-block" [class.btn-primary]="r.myVotedOptionId === opt.id" (click)="castVote(opt.id)">
                      {{ r.myVotedOptionId === opt.id ? '✓ Oyun Burada' : 'Buna Oy Ver 👍' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <div class="leave-row">
            <button type="button" class="btn btn-sm btn-ghost" (click)="leaveRoom()">← Odadan Ayrıl</button>
          </div>
        </div>
      }
    </main>
  `,
  styles: `
    .room-page { padding-bottom: 120px; }
    .header { margin-bottom: 20px; }
    .lobby-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .join-card, .create-card {
      padding: 22px;
      h3 { font-size: 19px; }
      .sub { font-size: 13.5px; margin: 4px 0 16px; }
    }
    .join-input-row {
      display: flex;
      gap: 10px;
    }
    .code-input {
      font-size: 18px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 2px;
      text-align: center;
    }
    .form-group {
      margin-bottom: 16px;
      label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
    }
    .candidates-selection {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
      padding: 4px 0;
    }
    .opt-chip {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 13.5px;
      padding: 7px 12px;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all .2s;
      &.selected {
        background: hsla(22, 100%, 62%, 0.25);
        border-color: hsla(22, 100%, 62%, 0.8);
        color: #fff;
      }
      .dist { font-size: 11.5px; }
    }
    .active-room-area {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .room-hero {
      padding: 18px;
    }
    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      h2 { font-size: 20px; }
    }
    .code-badge {
      display: inline-block;
      background: hsla(340, 86%, 60%, 0.2);
      border: 1px solid hsla(340, 86%, 60%, 0.4);
      color: #fff;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 1px;
    }
    .share-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .winner-box {
      padding: 20px;
      text-align: center;
      background: linear-gradient(135deg, hsla(158, 68%, 50%, 0.15), hsla(180, 70%, 42%, 0.15));
      border-color: hsla(158, 68%, 50%, 0.5);
      h3 { font-size: 24px; margin: 8px 0 4px; color: #fff; }
    }
    .winner-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--success);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .wheel-modal {
      padding: 20px;
      text-align: center;
    }
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .option-card {
      padding: 16px;
      border-radius: 18px;
      &.voted {
        border-color: hsla(22, 100%, 62%, 0.6);
        background: hsla(22, 100%, 62%, 0.08);
      }
      &.winner {
        border-color: var(--success);
      }
    }
    .opt-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      h4 { font-size: 17px; }
      .opt-sub { font-size: 12.5px; }
    }
    .vote-badge {
      text-align: center;
      background: var(--surface-2);
      border-radius: 12px;
      padding: 4px 10px;
      .count { font-size: 18px; font-weight: 800; display: block; color: #fff; }
      .lbl { font-size: 11px; color: var(--muted); }
    }
    .voters-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .voter-pill {
      font-size: 11.5px;
      background: rgba(255, 255, 255, 0.07);
      padding: 2px 8px;
      border-radius: 999px;
      color: var(--muted);
    }
    .leave-row {
      margin-top: 10px;
      text-align: center;
    }
  `
})
export class RoomComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private loc = inject(LocationService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly currentRoom = signal<Room | null>(null);
  readonly availableCandidates = signal<Candidate[]>([]);
  readonly selectedRestaurantIds = signal<number[]>([]);
  readonly loading = signal(false);
  readonly showWheelModal = signal(false);

  joinCode = '';
  roomTitle = 'Bugünkü Ekip Yemeği';

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.joinCode = params['code'];
        this.joinRoom();
      }
    });

    await this.loadNearbyForSelection();
  }

  isCreator() {
    return this.currentRoom()?.creatorUserId === this.auth.user()?.id;
  }

  roomWheelItems(): WheelItem[] {
    const opts = this.currentRoom()?.options ?? [];
    return opts.map(o => ({
      id: o.restaurantId,
      label: o.restaurantName,
      emoji: '🍽️'
    }));
  }

  async loadNearbyForSelection() {
    try {
      const coords = await this.loc.locate();
      const list = await this.api.candidates({
        lat: coords.lat,
        lng: coords.lng,
        radius: 2000,
        limit: 8
      });
      this.availableCandidates.set(list);
      // İlk 4 tanesini otomatik seç
      this.selectedRestaurantIds.set(list.slice(0, 4).map(c => c.id));
    } catch {
      // offline / demo fallback
    }
  }

  toggleCandidate(id: number) {
    this.selectedRestaurantIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  async createRoom() {
    this.loading.set(true);
    try {
      const room = await this.api.createRoom(this.roomTitle, this.selectedRestaurantIds());
      this.currentRoom.set(room);
      burstConfetti(40);
      this.toast.success(`Oda oluşturuldu! Kod: ${room.code} 👥`);
    } catch {
      this.toast.error('Oda oluşturulamadı.');
    } finally {
      this.loading.set(false);
    }
  }

  async joinRoom() {
    if (!this.joinCode.trim()) return;
    this.loading.set(true);
    try {
      const room = await this.api.getRoom(this.joinCode.trim());
      this.currentRoom.set(room);
      this.toast.success(`Odaya katıldın: ${room.title}`);
    } catch {
      this.toast.error('Oda bulunamadı veya kod hatalı.');
    } finally {
      this.loading.set(false);
    }
  }

  async castVote(roomOptionId: number) {
    const r = this.currentRoom();
    if (!r) return;
    try {
      const updated = await this.api.voteRoom(r.code, roomOptionId);
      this.currentRoom.set(updated);
      this.toast.success('Oyun kaydedildi 👍');
    } catch {
      this.toast.error('Oy verilemedi.');
    }
  }

  async refreshRoom() {
    const r = this.currentRoom();
    if (!r) return;
    try {
      const updated = await this.api.getRoom(r.code);
      this.currentRoom.set(updated);
      this.toast.success('Oylar güncellendi 🔄');
    } catch {
      this.toast.error('Oda güncellenemedi.');
    }
  }

  async closeRoom(winnerId?: number) {
    const r = this.currentRoom();
    if (!r) return;
    try {
      const updated = await this.api.closeRoom(r.code, winnerId);
      this.currentRoom.set(updated);
      burstConfetti(80);
      this.toast.success(`Oylama tamamlandı! Kazanan: ${updated.winningRestaurantName} 🏆`);
    } catch {
      this.toast.error('Oylama kapatılamadı.');
    }
  }

  onWheelWon(item: WheelItem) {
    this.toast.success(`Çark kazananı: ${item.label}! 🎡`);
    burstConfetti(90);
    if (this.isCreator()) {
      this.closeRoom(item.id);
    }
    this.showWheelModal.set(false);
  }

  copyShareLink() {
    const r = this.currentRoom();
    if (!r) return;
    const url = `${window.location.origin}/room?code=${r.code}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.success('Oylama linki panoya kopyalandı! 📋');
    });
  }

  leaveRoom() {
    this.currentRoom.set(null);
    this.joinCode = '';
  }
}
