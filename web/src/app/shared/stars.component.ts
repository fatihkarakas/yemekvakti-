import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Okunur veya düzenlenebilir 1-5 yıldız. */
@Component({
  selector: 'app-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stars-row" [class.editable]="editable()" [style.font-size.px]="size()" role="radiogroup" aria-label="Puan">
      @for (i of [1, 2, 3, 4, 5]; track i) {
        <button type="button" [id]="idPrefix() + '-star-' + i" class="star" [class.on]="i <= (value() ?? 0)"
                [disabled]="!editable()" (click)="set(i)" [attr.aria-label]="i + ' yıldız'">★</button>
      }
    </div>
  `,
  styles: `
    .stars-row { display: inline-flex; gap: 2px; line-height: 1; }
    .star {
      background: none; border: 0; padding: 0 1px; cursor: default;
      color: rgba(255,255,255,0.18); font-size: inherit; line-height: 1;
      transition: transform .2s cubic-bezier(0.34,1.56,0.64,1), color .15s;
      &.on { color: var(--star); text-shadow: 0 0 12px hsla(45,100%,60%,0.45); }
      &:disabled { opacity: 1; }
    }
    .editable .star { cursor: pointer; padding: 0 4px; }
    .editable .star:hover { transform: scale(1.2); }
    .editable .star:active { transform: scale(0.85); }
  `,
})
export class StarsComponent {
  readonly value = model<number | null>(null);
  readonly editable = input(false);
  readonly size = input(18);
  readonly idPrefix = input('stars');

  set(i: number) {
    if (this.editable()) this.value.set(this.value() === i ? null : i);
  }
}
