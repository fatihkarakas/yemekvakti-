import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page login-page">
      <div class="glow" aria-hidden="true"></div>

      <div class="brand pop-in">
        <div class="logo">🍽️</div>
        <h1>Yemek<span class="gradient-text">Vakti</span></h1>
        <p class="muted">Bugün öğle yemeğinde nereye gidiyoruz? Karar vermeyi şansa ve yapay zekaya bırak.</p>
      </div>

      <div class="login-card glass pop-in">
        <h2>Giriş Yap</h2>
        <p class="muted sub">Favorilerini, geçmişini ve oylamalarını kaydetmek için giriş yap.</p>

        <!-- Google Giriş Konteyneri -->
        <div id="google-btn-container" class="google-wrap">
          @if (!hasGoogleClient()) {
            <button type="button" class="google-custom-btn" (click)="onGoogleCustomClick()">
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Google ile Giriş Yap</span>
            </button>
          }
        </div>

        @if (demoEnabled()) {
          <div class="divider"><span>veya isim / hesap ile katıl</span></div>
          <div class="demo-form">
            <input id="demo-name-input" type="text" class="input" [(ngModel)]="demoName" placeholder="Adınız Soyadınız (Örn: Burak, Selin...)" (keyup.enter)="loginDemo()" />
            <input id="demo-email-input" type="email" class="input" [(ngModel)]="demoEmail" placeholder="E-posta (İsteğe bağlı)" (keyup.enter)="loginDemo()" />
            <button id="demo-login-btn" type="button" class="btn btn-primary btn-block" [disabled]="loading() || !demoName.trim()" (click)="loginDemo()">
              {{ loading() ? 'Giriş yapılıyor...' : 'Giriş Yap & Başla 🚀' }}
            </button>
          </div>
        }

        <div class="features-list">
          <div class="feat-item">🎯 <span>Konumuna en yakın lezzetler</span></div>
          <div class="feat-item">🎡 <span>Kararsız kalanlara dönen çark</span></div>
          <div class="feat-item">⭐ <span>Geçmişini puanla ve not al</span></div>
          <div class="feat-item">👥 <span>Ekipçe toplanıp oylama yap</span></div>
        </div>

        <div class="login-brand-footer">
          <a href="https://fatihkarakas.com.tr" target="_blank" rel="noopener" class="creator-badge">
            ⚡ <strong>fatihkarakas.com.tr</strong> ↗
          </a>
        </div>
      </div>
    </main>
  `,
  styles: `
    .login-page {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
      padding: 24px 18px;
    }
    .glow {
      position: absolute;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: var(--accent);
      filter: blur(90px);
      opacity: 0.18;
      top: 15%;
      pointer-events: none;
    }
    .brand {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 54px;
      display: inline-block;
      margin-bottom: 8px;
      filter: drop-shadow(0 8px 24px rgba(255, 122, 69, 0.4));
      animation: float 4s ease-in-out infinite;
    }
    h1 {
      font-size: 38px;
      font-weight: 800;
    }
    .brand p {
      margin-top: 8px;
      font-size: 15px;
      max-width: 340px;
      line-height: 1.4;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 26px 22px;
      text-align: center;
    }
    h2 { font-size: 22px; }
    .sub { font-size: 13.5px; margin: 6px 0 20px; }
    .google-wrap {
      display: flex;
      justify-content: center;
      min-height: 44px;
      margin-bottom: 12px;
    }
    .divider {
      position: relative;
      margin: 18px 0;
      text-align: center;
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--border);
      }
      span {
        position: relative;
        background: #1b1726;
        padding: 0 12px;
        font-size: 12px;
        color: var(--muted);
      }
    }
    .demo-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .features-list {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      text-align: left;
    }
    .feat-item {
      font-size: 12.5px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .login-brand-footer {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px dashed var(--border);
      text-align: center;
      .creator-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--muted);
        text-decoration: none;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.2s;
        strong { color: #fff; font-weight: 600; }
        &:hover {
          background: rgba(255, 122, 69, 0.15);
          border-color: rgba(255, 122, 69, 0.4);
          color: #ff7a45;
          strong { color: #ff7a45; }
        }
      }
    }
  `
})
export class LoginComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  readonly demoEnabled = signal(true);
  readonly loading = signal(false);
  readonly hasGoogleClient = signal(false);
  demoName = '';
  demoEmail = '';

  async ngOnInit() {
    try {
      const cfg = await this.api.authConfig();
      this.demoEnabled.set(cfg.demoLoginEnabled);
      if (cfg.googleClientId) {
        this.hasGoogleClient.set(true);
        this.initGoogleBtn(cfg.googleClientId);
      }
    } catch {
      // Offline / dev fallback
    }
  }

  onGoogleCustomClick() {
    this.toast.info('Google Giriş anahtarı tanımlandığında aktif olacaktır. İsminizle hemen giriş yapabilirsiniz! 🚀');
  }

  private initGoogleBtn(clientId: string) {
    const render = () => {
      const g = (window as any).google?.accounts?.id;
      const container = document.getElementById('google-btn-container');
      if (!g || !container) return;
      g.initialize({
        client_id: clientId,
        callback: async (res: any) => {
          if (!res.credential) return;
          try {
            this.loading.set(true);
            const loginRes = await this.api.loginGoogle(res.credential);
            this.auth.setSession(loginRes);
            this.toast.success(`Hoş geldin, ${loginRes.user.name}! 🌟`);
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            this.router.navigateByUrl(returnUrl);
          } catch {
            this.toast.error('Google ile giriş yapılamadı.');
          } finally {
            this.loading.set(false);
          }
        }
      });
      g.renderButton(container, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        locale: 'tr'
      });
    };

    if ((window as any).google?.accounts?.id) {
      setTimeout(render, 50);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setTimeout(render, 50);
    document.head.appendChild(script);
  }

  async loginDemo() {
    if (!this.demoName.trim()) return;
    this.loading.set(true);
    try {
      const res = await this.api.loginDemo(this.demoName.trim(), this.demoEmail.trim() || undefined);
      this.auth.setSession(res);
      this.toast.success(`Hoş geldin, ${res.user.name}! 🌟`);
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
      this.router.navigateByUrl(returnUrl);
    } catch {
      this.toast.error('Giriş başarısız oldu.');
    } finally {
      this.loading.set(false);
    }
  }
}
