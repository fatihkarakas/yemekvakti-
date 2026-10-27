import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AuthConfig, Candidate, CandidateQuery, Cuisine, HistoryStats, LoginResponse,
  MealCard, Preference, PreferenceType, Room, SuggestionResponse, Visit,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private get<T>(url: string) { return firstValueFrom(this.http.get<T>(url)); }
  private post<T>(url: string, body: unknown) { return firstValueFrom(this.http.post<T>(url, body)); }
  private put<T>(url: string, body: unknown) { return firstValueFrom(this.http.put<T>(url, body)); }
  private del(url: string) { return firstValueFrom(this.http.delete<void>(url)); }

  // Auth
  authConfig() { return this.get<AuthConfig>('/api/auth/config'); }
  loginGoogle(idToken: string) { return this.post<LoginResponse>('/api/auth/google', { idToken }); }
  loginDemo(name: string) { return this.post<LoginResponse>('/api/auth/demo', { name }); }

  // Öneri
  cuisines() { return this.get<Cuisine[]>('/api/cuisines'); }
  mealCards() { return this.get<MealCard[]>('/api/meal-cards'); }
  candidates(q: CandidateQuery) { return this.post<Candidate[]>('/api/candidates', q); }
  suggest(q: CandidateQuery) { return this.post<SuggestionResponse>('/api/suggest', q); }
  addRestaurant(r: { name: string; lat: number; lng: number; cuisines?: string[]; mealCards?: string[]; priceLevel?: number | null; priceTl?: number; address?: string }) {
    return this.post<number>('/api/restaurants', r);
  }

  // Geçmiş
  visits() { return this.get<Visit[]>('/api/visits'); }
  stats() { return this.get<HistoryStats>('/api/visits/stats'); }
  createVisit(restaurantId: number, source: Visit['source'], suggestionLogId?: number | null) {
    return this.post<Visit>('/api/visits', { restaurantId, source, suggestionLogId });
  }
  rateVisit(id: number, stars: number | null, note: string | null) {
    return this.put<Visit>(`/api/visits/${id}`, { stars, note });
  }
  deleteVisit(id: number) { return this.del(`/api/visits/${id}`); }

  // Tercihler
  preferences() { return this.get<Preference[]>('/api/preferences'); }
  setPreference(restaurantId: number, type: PreferenceType) {
    return this.post<void>('/api/preferences', { restaurantId, type });
  }
  removePreference(restaurantId: number) { return this.del(`/api/preferences/${restaurantId}`); }

  // Ekip / Oylama (Rooms)
  createRoom(title: string | null, restaurantIds: number[]) {
    return this.post<Room>('/api/rooms', { title, restaurantIds });
  }
  getRoom(code: string) {
    return this.get<Room>(`/api/rooms/${code}`);
  }
  voteRoom(code: string, roomOptionId: number) {
    return this.post<Room>(`/api/rooms/${code}/vote`, { roomOptionId });
  }
  closeRoom(code: string, winningRestaurantId?: number | null) {
    return this.post<Room>(`/api/rooms/${code}/close`, { winningRestaurantId });
  }
}
