import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface WheelItem {
  id: number;
  label: string;
  emoji: string;
  weight?: number;
}

const COLORS = ['#ff7a45', '#f0437a', '#a855f7', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e', '#0ea5e9', '#ef4444'];
const SPIN_MS = 5200;

@Component({
  selector: 'app-wheel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wheel-wrap" [class.spinning]="spinning()" [class.settled]="settled()">
      <!-- ULTRA LUXURY 3D POINTER / FLAPPER -->
      <div class="pointer-wrapper" [class.spinning]="spinning()" [class.settled]="settled()" aria-hidden="true">
        <div class="victory-ping" aria-hidden="true"></div>
        <svg class="pointer-svg" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="ptrShadow" x="-25%" y="-15%" width="150%" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.8" />
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9" />
            </filter>
            <!-- 3D Gold Gradients -->
            <linearGradient id="goldBladeL" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="25%" stop-color="#fef08a" />
              <stop offset="65%" stop-color="#f59e0b" />
              <stop offset="100%" stop-color="#d97706" />
            </linearGradient>
            <linearGradient id="goldBladeR" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="35%" stop-color="#d97706" />
              <stop offset="80%" stop-color="#92400e" />
              <stop offset="100%" stop-color="#451a03" />
            </linearGradient>
            <linearGradient id="goldBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef9c3" />
              <stop offset="25%" stop-color="#b45309" />
              <stop offset="50%" stop-color="#ffffff" />
              <stop offset="75%" stop-color="#78350f" />
              <stop offset="100%" stop-color="#f59e0b" />
            </linearGradient>
            <!-- Ruby Gem Radial -->
            <radialGradient id="rubyGem" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#ff758f" />
              <stop offset="30%" stop-color="#f43f5e" />
              <stop offset="70%" stop-color="#be123c" />
              <stop offset="100%" stop-color="#4c0519" />
            </radialGradient>
          </defs>

          <g filter="url(#ptrShadow)" class="pointer-g">
            <!-- 3D Beveled Arrow Blade -->
            <!-- Left Facet (Reflective Gold) -->
            <path d="M20 48 L6 15 L20 19 Z" fill="url(#goldBladeL)" />
            <!-- Right Facet (Deep Amber Shadow) -->
            <path d="M20 48 L34 15 L20 19 Z" fill="url(#goldBladeR)" />
            <!-- Specular Spine Ridge -->
            <path d="M20 19 L20 47.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />
            <!-- Gold Outline Edge -->
            <path d="M6 15 L20 48 L34 15 L20 19 Z" stroke="#ffd700" stroke-width="0.8" fill="none" opacity="0.75" />

            <!-- Top Hinge Bracket & Chrome Bezel -->
            <circle cx="20" cy="15" r="12" fill="url(#goldBezel)" stroke="#451a03" stroke-width="0.9" />
            <circle cx="20" cy="15" r="9.2" fill="#151022" stroke="#f59e0b" stroke-width="0.9" />

            <!-- Ruby Jewel Cabochon Pivot -->
            <circle cx="20" cy="15" r="7" fill="url(#rubyGem)" class="ruby-gem" />
            <!-- Ruby Specular Highlights -->
            <ellipse cx="17.8" cy="13" rx="2.8" ry="1.5" transform="rotate(-30 17.8 13)" fill="#ffffff" opacity="0.88" />
            <circle cx="22" cy="17" r="0.8" fill="#ffffff" opacity="0.5" />
          </g>
        </svg>
      </div>

      <!-- Ambient Dynamic Glow Backdrop -->
      <div class="glow" aria-hidden="true"></div>

      <!-- ROTATING WHEEL SVG -->
      <svg viewBox="0 0 300 300" class="wheel" role="img" [attr.aria-label]="'Çark: ' + items().length + ' restoran'"
           [style.transform]="'rotate(' + rotation() + 'deg)'"
           [style.transition]="spinning() ? 'transform ' + spinMs + 'ms cubic-bezier(0.12, 0.72, 0.08, 1)' : 'none'">
        <defs>
          <radialGradient id="shade" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stop-color="#000" stop-opacity="0" />
            <stop offset="94%" stop-color="#000" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#000" stop-opacity="0.5" />
          </radialGradient>
          <!-- Luxury Gold Wheel Rim -->
          <linearGradient id="rimGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="25%" stop-color="#b45309" />
            <stop offset="50%" stop-color="#fffbeb" />
            <stop offset="75%" stop-color="#78350f" />
            <stop offset="100%" stop-color="#f59e0b" />
          </linearGradient>
          <!-- 3D Brass Stud Pegs -->
          <radialGradient id="pegStud" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="35%" stop-color="#fef08a" />
            <stop offset="70%" stop-color="#d97706" />
            <stop offset="100%" stop-color="#451a03" />
          </radialGradient>
        </defs>

        <!-- Slices -->
        @for (s of slices(); track s.id) {
          <path [attr.d]="s.path" [attr.fill]="s.color" stroke="#120f1a" stroke-width="2" />
          <g [attr.transform]="'rotate(' + (s.mid - 90) + ' 150 150)'">
            <text x="178" y="150" class="label" dominant-baseline="middle" text-anchor="start">
              <tspan class="emoji">{{ s.emoji }}</tspan> {{ s.short }}
              @if (hasWeights() && s.pct > 0) {
                <tspan class="pct"> (%{{ s.pct }})</tspan>
              }
            </text>
          </g>
        }

        <!-- Wheel Rim Shading & Outer Gold Bezel -->
        <circle cx="150" cy="150" r="146" fill="url(#shade)" pointer-events="none" />
        <circle cx="150" cy="150" r="147" fill="none" stroke="url(#rimGold)" stroke-width="5" />
        <circle cx="150" cy="150" r="144" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1.2" />
        <circle cx="150" cy="150" r="142.5" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" />

        <!-- 3D Brass Peg Studs -->
        @for (d of dots(); track $index) {
          <g [attr.transform]="'translate(' + d.x + ',' + d.y + ')'">
            <circle r="4.2" fill="url(#pegStud)" />
            <circle cx="-1.1" cy="-1.1" r="1.3" fill="#ffffff" opacity="0.95" />
          </g>
        }
      </svg>

      <!-- CENTER HUB BUTTON -->
      <button id="wheel-spin-btn" class="hub" type="button" (click)="spin()" [disabled]="spinning() || items().length < 2"
              [title]="spinning() ? 'Çark dönüyor...' : 'Çarkı çevirmek için tıkla'">
        <span class="hub-label">{{ spinning() ? '...' : 'ÇEVİR' }}</span>
        <div class="hub-ring" aria-hidden="true"></div>
      </button>

      <!-- AUDIO SOUND MUTE TOGGLE -->
      <button class="sound-toggle-btn" type="button" (click)="toggleSound()"
              [title]="soundEnabled() ? 'Çark sesini kapat' : 'Çark sesini aç'"
              [class.muted]="!soundEnabled()">
        {{ soundEnabled() ? '🔊 Ses Açık' : '🔇 Ses Kapalı' }}
      </button>
    </div>
  `,
  styles: `
    :host { display: block; }
    .wheel-wrap {
      position: relative;
      width: min(86vw, 380px);
      aspect-ratio: 1;
      margin: 0 auto;
    }
    .glow {
      position: absolute; inset: 6%;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #ff7a45, #f0437a, #a855f7, #14b8a6, #ff7a45);
      filter: blur(38px);
      opacity: 0.35;
      z-index: -1;
      transition: opacity .4s;
    }
    .spinning .glow { opacity: 0.65; animation: spin-glow 2s linear infinite; }
    .settled .glow { opacity: 0.8; filter: blur(48px); }

    .wheel {
      width: 100%; height: 100%;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(255,255,255,0.08), 0 32px 64px -16px rgba(0,0,0,0.85);
      will-change: transform;
    }
    .label {
      fill: #fff;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.01em;
      paint-order: stroke;
      stroke: rgba(0,0,0,0.4);
      stroke-width: 2.2px;
    }
    .emoji { font-size: 13.5px; }
    .pct { font-size: 10.5px; font-weight: 600; opacity: 0.95; }

    /* --- PRO 3D POINTER / FLAPPER --- */
    .pointer-wrapper {
      position: absolute;
      top: -12px;
      left: 50%;
      width: 42px;
      height: 54px;
      transform: translateX(-50%);
      z-index: 5;
      pointer-events: none;
      transform-origin: 50% 15px; /* Exact center of ruby pivot jewel */
    }

    .pointer-svg {
      width: 100%;
      height: 100%;
      display: block;
      transform-origin: 50% 15px;
      transition: transform 0.1s cubic-bezier(0.2, 0.8, 0.4, 1);
    }

    /* High speed flapper chatter during spin */
    .pointer-wrapper.spinning .pointer-svg {
      animation: flapper-flutter 0.085s ease-in-out infinite alternate;
    }

    @keyframes flapper-flutter {
      0% { transform: rotate(0deg); }
      30% { transform: rotate(14deg) scale(0.98); }
      65% { transform: rotate(-5deg); }
      85% { transform: rotate(11deg); }
      100% { transform: rotate(1deg); }
    }

    /* Settle & Spring Celebration on landing */
    .pointer-wrapper.settled .pointer-svg {
      animation: flapper-settle 0.85s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    }

    @keyframes flapper-settle {
      0% { transform: rotate(20deg); }
      25% { transform: rotate(-12deg); }
      45% { transform: rotate(7deg); }
      65% { transform: rotate(-3deg); }
      82% { transform: rotate(1.5deg); }
      100% { transform: rotate(0deg); }
    }

    .pointer-wrapper.settled .ruby-gem {
      animation: ruby-pulse 1s ease-out;
    }

    @keyframes ruby-pulse {
      0% { filter: drop-shadow(0 0 16px #ff1744) brightness(2); }
      50% { filter: drop-shadow(0 0 24px #ff5252) brightness(2.4); }
      100% { filter: none; }
    }

    /* Shockwave ring on winning */
    .victory-ping {
      display: none;
      position: absolute;
      top: 15px;
      left: 50%;
      width: 24px;
      height: 24px;
      transform: translate(-50%, -50%) scale(0.5);
      border-radius: 50%;
      border: 2px solid #ffd700;
      box-shadow: 0 0 20px #ff7a45, inset 0 0 10px #ffd700;
      pointer-events: none;
    }

    .pointer-wrapper.settled .victory-ping {
      display: block;
      animation: victory-pulse 0.9s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
    }

    @keyframes victory-pulse {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
    }

    /* --- PRO HUB BUTTON --- */
    .hub {
      position: absolute; top: 50%; left: 50%;
      width: 27%; aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 3.5px solid #fff;
      background: radial-gradient(circle at 35% 28%, #ff8e68 0%, #f43f5e 50%, #9f1239 100%);
      color: #fff;
      font: 850 clamp(13px, 3.8vw, 17px) 'Outfit', sans-serif;
      letter-spacing: 0.06em;
      cursor: pointer;
      box-shadow:
        0 0 0 2.5px #78350f,
        0 0 0 5px #fbbf24,
        0 14px 34px -4px rgba(240, 67, 122, 0.85),
        inset 0 3px 6px rgba(255,255,255,0.4),
        inset 0 -4px 10px rgba(0,0,0,0.4);
      transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .22s ease;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover:not(:disabled) {
        transform: translate(-50%, -50%) scale(1.08);
        box-shadow:
          0 0 0 2.5px #78350f,
          0 0 0 6px #fde047,
          0 16px 40px -4px rgba(240, 67, 122, 1),
          inset 0 3px 6px rgba(255,255,255,0.6);
      }
      &:active:not(:disabled) {
        transform: translate(-50%, -50%) scale(0.93);
      }
      &:disabled {
        cursor: default;
        opacity: 0.94;
      }
    }

    .hub-label {
      position: relative;
      z-index: 1;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .hub-ring {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 215, 0, 0.4);
      animation: hub-breathe 2.4s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes hub-breathe {
      0%, 100% { transform: scale(0.96); opacity: 0.3; }
      50% { transform: scale(1.06); opacity: 0.8; }
    }

    /* Sound mute toggle pill */
    .sound-toggle-btn {
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(18, 15, 26, 0.8);
      border: 1px solid rgba(255,255,255,0.14);
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 11px;
      border-radius: 999px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.2s;
      white-space: nowrap;
      z-index: 2;

      &:hover {
        background: rgba(30, 25, 45, 0.95);
        border-color: rgba(255, 215, 0, 0.4);
        color: #fff;
      }
      &.muted {
        opacity: 0.65;
        color: #94a3b8;
      }
    }

    @keyframes spin-glow { to { transform: rotate(360deg); } }
  `,
})
export class WheelComponent {
  readonly items = input.required<WheelItem[]>();
  readonly result = output<WheelItem>();
  readonly spinStart = output<void>();

  readonly rotation = signal(0);
  readonly spinning = signal(false);
  readonly settled = signal(false);
  readonly soundEnabled = signal(true);
  readonly spinMs = SPIN_MS;

  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;

  constructor() {
    try {
      this.soundEnabled.set(localStorage.getItem('yv_wheel_sound') !== '0');
    } catch {
      this.soundEnabled.set(true);
    }
  }

  toggleSound() {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    try {
      localStorage.setItem('yv_wheel_sound', next ? '1' : '0');
    } catch {}
  }

  readonly hasWeights = computed(() => {
    return this.items().some(it => (it.weight ?? 1) > 1);
  });

  readonly slices = computed(() => {
    const items = this.items();
    const n = Math.max(items.length, 1);
    const totalWeight = items.reduce((sum, it) => sum + Math.max(it.weight ?? 1, 1), 0);

    let accumAngle = 0;
    return items.map((it, i) => {
      const w = Math.max(it.weight ?? 1, 1);
      const angle = (w / totalWeight) * 360;
      const a0 = accumAngle;
      const a1 = accumAngle + angle;
      accumAngle = a1;

      const pct = Math.round((w / totalWeight) * 100);
      const maxLen = angle < 30 ? 9 : angle < 50 ? 12 : 15;

      return {
        id: it.id,
        emoji: it.emoji,
        short: it.label.length > maxLen ? it.label.slice(0, maxLen - 1) + '…' : it.label,
        mid: a0 + angle / 2,
        angle,
        a0,
        a1,
        pct,
        color: COLORS[i % COLORS.length] === COLORS[0] && i === n - 1 && n > 1 ? COLORS[2] : COLORS[i % COLORS.length],
        path: n === 1 ? 'M150,4 A146,146 0 1,1 149.99,4 Z' : this.arc(a0, a1),
      };
    });
  });

  readonly dots = computed(() => {
    return this.slices().map(s => {
      const a = (s.a0 - 90) * (Math.PI / 180);
      return { x: 150 + 138 * Math.cos(a), y: 150 + 138 * Math.sin(a) };
    });
  });

  spin() {
    const items = this.items();
    if (this.spinning() || items.length < 2) return;

    const totalWeight = items.reduce((sum, it) => sum + Math.max(it.weight ?? 1, 1), 0);
    let rnd = Math.random() * totalWeight;
    let winnerIndex = 0;
    for (let i = 0; i < items.length; i++) {
      const w = Math.max(items[i].weight ?? 1, 1);
      if (rnd < w) {
        winnerIndex = i;
        break;
      }
      rnd -= w;
    }

    const slice = this.slices()[winnerIndex];
    const seg = slice.angle;
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    // Çark saat yönünde R derece dönünce, üstteki ibre (0 derece) çarkın (360 - R) açısını gösterir.
    const target = 360 - (slice.mid + jitter);
    const current = this.rotation();
    const delta = ((target - current) % 360 + 360) % 360;
    const turns = 5 + Math.floor(Math.random() * 3);

    this.spinStart.emit();
    this.settled.set(false);
    this.spinning.set(true);

    // Initialize Web Audio on user gesture
    this.initAudio();
    this.startRatchetSoundLoop();

    requestAnimationFrame(() => this.rotation.set(current + turns * 360 + delta));

    setTimeout(() => {
      this.spinning.set(false);
      this.settled.set(true);

      // Stop audio loop and play victory chime
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.playWinChime();
      navigator.vibrate?.([40, 60, 140]);

      this.result.emit(items[winnerIndex]);

      // Reset settled state after celebration animation
      setTimeout(() => this.settled.set(false), 2400);
    }, SPIN_MS + 80);
  }

  private arc(a0: number, a1: number) {
    const r = 146, cx = 150, cy = 150;
    const p = (a: number) => {
      const rad = (a - 90) * (Math.PI / 180);
      return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
    };
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${cx},${cy} L${p(a0)} A${r},${r} 0 ${large},1 ${p(a1)} Z`;
  }

  // --- MECHANICAL AUDIO SYNTHESIZER ---
  private initAudio() {
    if (!this.soundEnabled() || typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {}
  }

  private startRatchetSoundLoop() {
    if (!this.soundEnabled() || !this.audioCtx) return;
    const startTime = performance.now();
    let nextTickTime = 0;

    const tickLoop = (now: number) => {
      if (!this.spinning()) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / this.spinMs, 1);

      if (elapsed >= nextTickTime) {
        // Dynamic deceleration matching cubic-bezier
        const slowFactor = Math.pow(progress, 3.2);
        const interval = 36 + slowFactor * 540;
        nextTickTime = elapsed + interval;

        const pitch = 1.25 - progress * 0.45;
        this.playRatchetTick(pitch);

        if (progress > 0.78) {
          navigator.vibrate?.(15);
        }
      }

      if (elapsed < this.spinMs) {
        this.animFrameId = requestAnimationFrame(tickLoop);
      }
    };

    this.animFrameId = requestAnimationFrame(tickLoop);
  }

  private playRatchetTick(pitchFactor: number) {
    if (!this.soundEnabled() || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1300 * pitchFactor, ctx.currentTime);
      filter.Q.setValueAtTime(3.2, ctx.currentTime);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750 * pitchFactor, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.024);

      gain.gain.setValueAtTime(0.32 * Math.min(pitchFactor, 1.1), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.024);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.026);
    } catch {}
  }

  private playWinChime() {
    if (!this.soundEnabled() || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6 luxury cascade
      notes.forEach((freq, idx) => {
        const t0 = ctx.currentTime + idx * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.24, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.75);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.8);
      });
    } catch {}
  }
}
