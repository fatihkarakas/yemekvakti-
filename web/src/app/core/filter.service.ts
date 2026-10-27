import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Cuisine } from './models';

const FILTER_KEY = 'yv.filters';

export interface Filters {
  cuisines: string[];
  radius: number;
  maxPrice: number | null;
  avoidDays: number;
}

/** Seçili yemek tarzı / mesafe / bütçe filtreleri (kalıcı). */
@Injectable({ providedIn: 'root' })
export class FilterService {
  private api = inject(ApiService);
  readonly all = signal<Cuisine[]>([]);
  readonly filters = signal<Filters>({
    cuisines: [],
    radius: 1500,
    maxPrice: null,
    avoidDays: 5,
    ...JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}'),
  });

  async load() {
    if (this.all().length === 0) this.all.set(await this.api.cuisines());
  }

  set(f: Partial<Filters>) {
    this.filters.update((cur) => ({ ...cur, ...f }));
    localStorage.setItem(FILTER_KEY, JSON.stringify(this.filters()));
  }

  emoji(code: string) { return this.all().find((c) => c.code === code)?.emoji ?? '🍽️'; }
  label(code: string) { return this.all().find((c) => c.code === code)?.label ?? code; }
}
