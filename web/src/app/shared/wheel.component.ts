import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface WheelItem { id: number; label: string; emoji: string; }

const COLORS = ['#ff7a45', '#f0437a', '#a855f7', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e', '#0ea5e9', '#ef4444'];
const SPIN_MS = 5200;

@Component({
  selector: 'app-wheel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wheel-wrap" [class.spinning]="spinning()">
      <div class="pointer" aria-hidden="true"></div>
      <div class="glow" aria-hidden="true"></div>
      <svg viewBox="0 0 300 300" class="wheel" role="img" [attr.aria-label]="'Çark: ' + items().length + ' restoran'"
           [style.transform]="'rotate(' + rotation() + 'deg)'"
           [style.transition]="spinning() ? 'transform ' + spinMs + 'ms cubic-bezier(0.12, 0.72, 0.08, 1)' : 'none'">
        <defs>
          <radialGradient id="shade" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stop-color="#000" stop-opacity="0" />
            <stop offset="100%" stop-color="#000" stop-opacity="0.28" />
          </radialGradient>
        </defs>
        @for (s of slices(); track s.id) {
          <path [attr.d]="s.path" [attr.fill]="s.color" stroke="#120f1a" stroke-width="2" />
          <g [attr.transform]="'rotate(' + (s.mid - 90) + ' 150 150)'">
            <text x="182" y="150" class="label" dominant-baseline="middle" text-anchor="start">
              <tspan class="emoji">{{ s.emoji }}</tspan> {{ s.short }}
            </text>
          </g>
        }
        <circle cx="150" cy="150" r="146" fill="url(#shade)" pointer-events="none" />
        <circle cx="150" cy="150" r="146" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3" />
        @for (d of dots(); track $index) {
          <circle [attr.cx]="d.x" [attr.cy]="d.y" r="3" fill="#fff" opacity="0.85" />
        }
      </svg>
      <button id="wheel-spin-btn" class="hub" type="button" (click)="spin()" [disabled]="spinning() || items().length < 2">
        {{ spinning() ? '...' : 'ÇEVİR' }}
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
    .spinning .glow { opacity: 0.6; animation: spin-glow 2s linear infinite; }
    .wheel {
      width: 100%; height: 100%;
      border-radius: 50%;
      box-shadow: 0 0 0 8px rgba(255,255,255,0.06), 0 30px 60px -20px rgba(0,0,0,0.8);
      will-change: transform;
    }
    .label { fill: #fff; font-size: 12.5px; font-weight: 700; letter-spacing: 0.01em; paint-order: stroke; stroke: rgba(0,0,0,0.18); stroke-width: 2px; }
    .emoji { font-size: 14px; }
    .pointer {
      position: absolute; top: -10px; left: 50%;
      width: 34px; height: 44px;
      transform: translateX(-50%);
      z-index: 3;
      background: linear-gradient(180deg, #fff, #ffd9c7);
      clip-path: polygon(50% 100%, 0 0, 100% 0);
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
      transform-origin: 50% 0;
    }
    .spinning .pointer { animation: tick 0.12s ease-in-out infinite alternate; }
    .hub {
      position: absolute; top: 50%; left: 50%;
      width: 26%; aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 4px solid rgba(255,255,255,0.9);
      background: radial-gradient(circle at 35% 30%, #ff9a6a, #f0437a 70%);
      color: #fff;
      font: 800 clamp(13px, 3.6vw, 17px) 'Outfit', sans-serif;
      letter-spacing: 0.06em;
      cursor: pointer;
      box-shadow: 0 10px 30px -6px rgba(240, 67, 122, 0.8), inset 0 -4px 10px rgba(0,0,0,0.2);
      transition: transform .2s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 2;
      &:hover:not(:disabled) { transform: translate(-50%, -50%) scale(1.06); }
      &:active:not(:disabled) { transform: translate(-50%, -50%) scale(0.92); }
      &:disabled { cursor: default; opacity: 0.9; }
    }
    @keyframes tick { from { transform: translateX(-50%) rotate(-8deg); } to { transform: translateX(-50%) rotate(8deg); } }
    @keyframes spin-glow { to { transform: rotate(360deg); } }
  `,
})
export class WheelComponent {
  readonly items = input.required<WheelItem[]>();
  readonly result = output<WheelItem>();
  readonly spinStart = output<void>();

  readonly rotation = signal(0);
  readonly spinning = signal(false);
  readonly spinMs = SPIN_MS;

  readonly slices = computed(() => {
    const items = this.items();
    const n = Math.max(items.length, 1);
    const seg = 360 / n;
    return items.map((it, i) => {
      const a0 = i * seg, a1 = (i + 1) * seg;
      return {
        id: it.id,
        emoji: it.emoji,
        short: it.label.length > 15 ? it.label.slice(0, 14) + '…' : it.label,
        mid: a0 + seg / 2,
        color: COLORS[i % COLORS.length] === COLORS[0] && i === n - 1 && n > 1 ? COLORS[2] : COLORS[i % COLORS.length],
        path: n === 1 ? 'M150,4 A146,146 0 1,1 149.99,4 Z' : this.arc(a0, a1),
      };
    });
  });

  readonly dots = computed(() => {
    const n = Math.max(this.items().length, 1);
    return Array.from({ length: n }, (_, i) => {
      const a = ((i * 360) / n - 90) * (Math.PI / 180);
      return { x: 150 + 138 * Math.cos(a), y: 150 + 138 * Math.sin(a) };
    });
  });

  spin() {
    const items = this.items();
    if (this.spinning() || items.length < 2) return;

    const n = items.length;
    const seg = 360 / n;
    const winner = Math.floor(Math.random() * n);
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    // Çark saat yönünde R derece dönünce, üstteki ibre çarkın (360 - R) açısını gösterir.
    const target = 360 - ((winner + 0.5) * seg + jitter);
    const current = this.rotation();
    const delta = ((target - current) % 360 + 360) % 360;
    const turns = 5 + Math.floor(Math.random() * 3);

    this.spinStart.emit();
    this.spinning.set(true);
    // Reflow sonrası transition'ın uygulanması için bir frame bekle
    requestAnimationFrame(() => this.rotation.set(current + turns * 360 + delta));

    setTimeout(() => {
      this.spinning.set(false);
      navigator.vibrate?.([30, 40, 60]);
      this.result.emit(items[winner]);
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
}
