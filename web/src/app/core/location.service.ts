import { Injectable, signal } from '@angular/core';

export interface Coords { lat: number; lng: number; }
type LocStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'fallback';

const LAST_KEY = 'yv.lastLocation';
/** Konum alınamazsa kullanılacak varsayılan (İstanbul - Levent). */
const FALLBACK: Coords = { lat: 41.0814, lng: 29.0093 };

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly coords = signal<Coords | null>(JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null'));
  readonly status = signal<LocStatus>('idle');

  /** Konumu alır; izin yoksa son bilinen ya da varsayılan konumu döner. */
  locate(): Promise<Coords> {
    if (!('geolocation' in navigator)) return Promise.resolve(this.useFallback());
    this.status.set('locating');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          localStorage.setItem(LAST_KEY, JSON.stringify(c));
          this.coords.set(c);
          this.status.set('ok');
          resolve(c);
        },
        (err) => {
          this.status.set(err.code === err.PERMISSION_DENIED ? 'denied' : 'fallback');
          resolve(this.coords() ?? this.useFallback());
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }

  private useFallback(): Coords {
    this.status.set('fallback');
    this.coords.set(FALLBACK);
    return FALLBACK;
  }
}
