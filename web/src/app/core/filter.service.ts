import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Cuisine, MealCard } from './models';

const FILTER_KEY = 'yv.filters';

export interface Filters {
  cuisines: string[];
  mealCards: string[];
  radius: number;
  minPriceTl: number | null;
  maxPriceTl: number | null;
  maxPrice: number | null;
  avoidDays: number;
}

/** Seçili yemek tarzı / yemek kartı / mesafe / bütçe filtreleri (kalıcı). */
@Injectable({ providedIn: 'root' })
export class FilterService {
  private api = inject(ApiService);
  readonly all = signal<Cuisine[]>([]);
  readonly allMealCards = signal<MealCard[]>([]);

  private getInitialFilters(): Filters {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}');
      return {
        cuisines: [],
        mealCards: [],
        minPriceTl: null,
        maxPriceTl: null,
        maxPrice: null,
        avoidDays: 5,
        ...saved,
        radius: saved.radius ?? 5000,
      };
    } catch {
      return { cuisines: [], mealCards: [], radius: 5000, minPriceTl: null, maxPriceTl: null, maxPrice: null, avoidDays: 5 };
    }
  }

  readonly filters = signal<Filters>(this.getInitialFilters());

  async load() {
    if (this.all().length === 0) {
      try { this.all.set(await this.api.cuisines()); } catch {}
    }
    if (this.allMealCards().length === 0) {
      try { this.allMealCards.set(await this.api.mealCards()); } catch {}
    }
  }

  set(f: Partial<Filters>) {
    this.filters.update((cur) => ({ ...cur, ...f }));
    localStorage.setItem(FILTER_KEY, JSON.stringify(this.filters()));
  }

  emoji(code: string) { return this.all().find((c) => c.code === code)?.emoji ?? '🍽️'; }
  label(code: string) { return this.all().find((c) => c.code === code)?.label ?? code; }

  mealCard(code: string) { return this.allMealCards().find(m => m.code === code); }
  mealCardLabel(code: string) { return this.mealCard(code)?.label ?? code; }
  mealCardColor(code: string) { return this.mealCard(code)?.color ?? '#8b5cf6'; }
  mealCardEmoji(code: string) { return this.mealCard(code)?.emoji ?? '💳'; }
}
