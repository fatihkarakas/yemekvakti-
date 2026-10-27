import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
              <div class="search-mini-bar" style="display:flex;gap:8px;margin-bottom:8px;">
                <input type="text" class="input" style="font-size:13px;padding:6px 12px;" [(ngModel)]="candidateSearch" placeholder="Listeye mekan ara ve ekle (Örn: Burger, Kebap)..." (keyup.enter)="searchCandidates()" />
                <button type="button" class="btn btn-sm btn-primary" (click)="searchCandidates()">Ara</button>
              </div>
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

            <!-- Ekip Paylaşım & Kopyalama Kutusu -->
            <div class="share-box glass pop-in">
              <div class="share-box-header">
                <span class="share-label">📢 <strong>Ekibe Oylama Linki Gönder</strong></span>
                <span class="code-badge" title="Oda Kodu">{{ r.code }}</span>
              </div>

              <!-- Mobil & Masaüstü İçin Tek Tıkla Kopyalama Çubuğu -->
              <div class="share-input-group">
                <input #shareInput type="text" readonly [value]="getShareUrl()" class="share-url-input" (click)="copyShareLink(shareInput)" title="Kopyalamak için tıkla" />
                <button type="button" class="btn btn-sm btn-copy" [class.copied]="isCopied()" (click)="copyShareLink(shareInput)">
                  {{ isCopied() ? '✓ Kopyalandı!' : '📋 Kopyala' }}
                </button>
              </div>

              <div class="share-buttons-row">
                <a [href]="getWhatsAppShareUrl()" target="_blank" rel="noopener" class="btn btn-sm btn-whatsapp">
                  🟢 WhatsApp ile Paylaş
                </a>
                <button type="button" class="btn btn-sm btn-primary" (click)="shareRoomLink()">
                  📲 Paylaş (Uygulamalar)
                </button>
                <button type="button" class="btn btn-sm btn-ghost" (click)="refreshRoom()">
                  🔄 Yenile
                </button>
                @if (!r.isClosed && r.options.length >= 2) {
                  <button type="button" class="btn btn-sm btn-ghost" style="color: #fbbf24;" (click)="showWheelModal.set(!showWheelModal())">
                    🎡 Çarkla Seç
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Kazanan Belli Olduysa VEYA Karar Verildiyse -->
          @if (r.winningRestaurantName) {
            <div class="winner-box glass pop-in" [class.confirmed]="r.isConfirmed">
              <span class="winner-tag">
                {{ r.isConfirmed ? '🎉 EKİP KARARI KESİNLEŞTİ!' : '🏆 Oylama Tamamlandı! Kazanan:' }}
              </span>
              <h3>{{ r.winningRestaurantName }}</h3>
              <p class="muted">
                @if (r.isConfirmed) {
                  {{ r.confirmedBy ? r.confirmedBy + ' tarafından "Buraya Gidilecek" olarak kaydedildi! Ekip yola çıkıyor 🚀' : 'Ekip yola çıkıyor, afiyet olsun! 🚀' }}
                } @else {
                  Ekip kararını verdi, gitmeye hazır mısınız?
                }
              </p>

              <div class="winner-actions" style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                @if (!r.isConfirmed && isCreator()) {
                  <button id="confirm-lunch-btn" type="button" class="btn btn-success btn-block" [disabled]="loading()" (click)="confirmLunch(r.winningRestaurantId)">
                    ✅ Buraya Gidilecek Olarak Kaydet (Ekibe Yansıt) 🚀
                  </button>
                }
                @if (r.isConfirmed) {
                  <div class="confirmed-badge">
                    ✓ Karar kesinleşti ve tüm ekibin ziyaret geçmişine kaydedildi!
                  </div>
                }
                @if (r.winningRestaurantMapsUrl) {
                  <a [href]="r.winningRestaurantMapsUrl" target="_blank" rel="noopener" class="btn btn-sm btn-ghost maps-link">
                    🧭 Google Maps ile Yol Tarifi Al ↗
                  </a>
                }
              </div>
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
          @if (r.options.length === 0) {
            <div class="glass pop-in" style="padding: 24px; text-align: center; border-radius: 18px; margin: 16px 0;">
              <p style="font-size: 34px; margin-bottom: 8px;">🍽️</p>
              <h4 style="font-size: 17px; margin-bottom: 6px; color:#fff;">Bu odada oylanacak mekan bulunamadı</h4>
              <p class="muted" style="font-size: 13px; margin-bottom: 16px;">Mekanlar güncellenmiş olabilir. Yeni bir oylama odası açıp ekibi davet edebilirsiniz.</p>
              <button type="button" class="btn btn-primary" (click)="leaveRoom()">Yeni Oda Aç 🚀</button>
            </div>
          } @else {
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
                  <div class="opt-action" style="display: flex; flex-direction: column; gap: 6px;">
                    <button type="button" class="btn btn-sm btn-block" [class.btn-primary]="r.myVotedOptionId === opt.id" (click)="castVote(opt.id)">
                      {{ r.myVotedOptionId === opt.id ? '✓ Oyun Burada' : 'Buna Oy Ver 👍' }}
                    </button>
                    @if (isCreator()) {
                      <button type="button" class="btn btn-sm btn-ghost" style="font-size: 12px; color: var(--success); border-color: rgba(34, 197, 94, 0.3);" (click)="confirmLunch(opt.restaurantId)">
                        🎯 Buraya Gidelim (Seç & Kesinleştir)
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

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
    .winner-box {
      padding: 20px;
      text-align: center;
      background: linear-gradient(135deg, hsla(158, 68%, 50%, 0.15), hsla(180, 70%, 42%, 0.15));
      border: 1px solid hsla(158, 68%, 50%, 0.5);
      border-radius: 18px;
      transition: all 0.3s;
      &.confirmed {
        background: linear-gradient(135deg, hsla(158, 68%, 50%, 0.25), hsla(180, 70%, 42%, 0.25));
        border: 2px solid var(--success);
        box-shadow: 0 12px 36px -10px hsla(158, 68%, 50%, 0.55);
      }
      h3 { font-size: 24px; margin: 8px 0 4px; color: #fff; }
    }
    .winner-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--success);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .confirmed-badge {
      background: hsla(158, 68%, 50%, 0.18);
      border: 1px solid hsla(158, 68%, 50%, 0.5);
      color: #4ade80;
      font-size: 13px;
      font-weight: 600;
      padding: 9px 12px;
      border-radius: 12px;
      text-align: center;
    }
    .maps-link {
      color: #38bdf8 !important;
      border-color: rgba(56, 189, 248, 0.4) !important;
      &:hover { background: rgba(56, 189, 248, 0.15) !important; }
    }
    .share-box {
      margin-top: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .share-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .share-label { font-size: 13.5px; color: #fff; }
    }
    .share-input-group {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .share-url-input {
      flex: 1;
      min-width: 0;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      padding: 8px 12px;
      color: #38bdf8;
      font-size: 13px;
      font-family: monospace;
      outline: none;
      cursor: pointer;
      transition: all 0.2s;
      &:focus, &:hover {
        border-color: #38bdf8;
        background: rgba(0, 0, 0, 0.7);
      }
    }
    .btn-copy {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.2s;
      &.copied {
        background: var(--success);
        color: #fff;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
      }
    }
    .share-buttons-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn-whatsapp {
      background: #25D366 !important;
      color: #fff !important;
      font-weight: 600 !important;
      border: none !important;
      box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);
      &:hover {
        background: #1ebc57 !important;
        transform: translateY(-1px);
      }
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
export class RoomComponent implements OnInit, OnDestroy {
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
  readonly isCopied = signal(false);

  joinCode = '';
  roomTitle = 'Bugünkü Ekip Yemeği';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private copyTimeout: any = null;

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.joinCode = params['code'].trim().toUpperCase();
        this.joinRoom();
      }
    });

    await this.loadNearbyForSelection();
  }

  ngOnDestroy() {
    this.stopPolling();
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
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

  candidateSearch = '';

  async searchCandidates() {
    if (!this.candidateSearch.trim()) return;
    try {
      const results = await this.api.searchRestaurants(this.candidateSearch.trim());
      if (results && results.length > 0) {
        const current = this.availableCandidates();
        const newItems = results.filter(r => !current.some(c => c.id === r.id));
        this.availableCandidates.set([...newItems, ...current]);
        const toAdd = newItems.slice(0, 2).map(x => x.id);
        this.selectedRestaurantIds.update(ids => Array.from(new Set([...ids, ...toAdd])));
        this.toast.success(`${newItems.length} yeni mekan listeye eklendi! ✨`);
        this.candidateSearch = '';
      } else {
        this.toast.info('Aramaya uygun mekan bulunamadı.');
      }
    } catch {
      this.toast.error('Arama sırasında hata oluştu.');
    }
  }

  async loadNearbyForSelection() {
    try {
      const coords = await this.loc.locate();
      const list = await this.api.candidates({
        lat: coords.lat,
        lng: coords.lng,
        radius: 3500,
        limit: 10
      });
      if (list && list.length > 0) {
        this.availableCandidates.set(list);
        this.selectedRestaurantIds.set(list.slice(0, 4).map(c => c.id));
        return;
      }
    } catch {
      // fallback to Ankara coordinates
    }

    try {
      const fallbackList = await this.api.candidates({
        lat: 39.8722,
        lng: 32.7489,
        radius: 6000,
        limit: 10
      });
      this.availableCandidates.set(fallbackList);
      this.selectedRestaurantIds.set(fallbackList.slice(0, 4).map(c => c.id));
    } catch {}
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
      this.startPolling();
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
      const room = await this.api.getRoom(this.joinCode.trim().toUpperCase());
      this.currentRoom.set(room);
      this.toast.success(`Odaya katıldın: ${room.title}`);
      this.startPolling();
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
      burstConfetti(35);
      this.toast.success('Oyun kaydedildi 👍');
    } catch (err: any) {
      this.toast.error(err?.error || 'Oy verilemedi.');
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

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      const r = this.currentRoom();
      if (!r || r.isClosed) {
        this.stopPolling();
        return;
      }
      try {
        const updated = await this.api.getRoom(r.code);
        this.currentRoom.set(updated);
      } catch {}
    }, 3000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async closeRoom(winnerId?: number) {
    const r = this.currentRoom();
    if (!r) return;
    try {
      const updated = await this.api.closeRoom(r.code, winnerId);
      this.currentRoom.set(updated);
      this.stopPolling();
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

  async confirmLunch(restaurantId?: number | null) {
    const r = this.currentRoom();
    if (!r) return;
    this.loading.set(true);
    try {
      const updated = await this.api.confirmRoom(r.code, restaurantId);
      this.currentRoom.set(updated);
      burstConfetti(100);
      this.toast.success('Karar onaylandı ve tüm ekibin geçmişine kaydedildi! 🚀');
    } catch {
      this.toast.error('Karar kaydedilemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  getShareUrl(): string {
    const r = this.currentRoom();
    if (!r) return '';
    return `${window.location.origin}/room?code=${r.code}`;
  }

  getWhatsAppShareUrl(): string {
    const r = this.currentRoom();
    if (!r) return '';
    const text = `🍽️ *${r.title}*\nBugün öğle yemeğinde nereye gidiyoruz? Oylamaya katıl, oyunu ver:\n${this.getShareUrl()}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  shareRoomLink() {
    const r = this.currentRoom();
    if (!r) return;
    const url = this.getShareUrl();
    const title = `${r.title} - YemekVakti`;
    const text = `Bugün öğle yemeğinde nereye gidelim? Oylamaya katıl, oyunu ver:`;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {
        this.copyShareLink();
      });
    } else {
      this.copyShareLink();
    }
  }

  async copyShareLink(inputEl?: HTMLInputElement) {
    const url = this.getShareUrl();
    if (!url) return;

    if (inputEl) {
      inputEl.focus();
      inputEl.select();
      inputEl.setSelectionRange(0, 99999);
    }

    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = this.fallbackCopy(url);
      }
    } else {
      copied = this.fallbackCopy(url);
    }

    if (copied) {
      this.isCopied.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.isCopied.set(false), 2500);
      this.toast.success('Oylama linki kopyalandı! WhatsApp veya grupta paylaşabilirsiniz 📋');
    }
  }

  private fallbackCopy(text: string): boolean {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '2em';
    ta.style.height = '2em';
    ta.style.padding = '0';
    ta.style.border = 'none';
    ta.style.outline = 'none';
    ta.style.boxShadow = 'none';
    ta.style.background = 'transparent';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, 99999);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    if (!ok) {
      this.toast.info(`Link: ${text}`);
    }
    return ok;
  }

  leaveRoom() {
    this.stopPolling();
    this.currentRoom.set(null);
    this.joinCode = '';
  }
}

