import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Coords { lat: number; lng: number; }
export type LocStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'fallback' | 'manual';

export interface AddressResult {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  neighborhood?: string;
}

const LAST_COORDS_KEY = 'yv.lastLocation';
const LAST_LABEL_KEY = 'yv.lastLabel';
const IS_MANUAL_KEY = 'yv.isManual';

/** Varsayılan: İstanbul - Levent */
const FALLBACK: Coords = { lat: 41.0814, lng: 29.0093 };

@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);

  readonly coords = signal<Coords>(
    JSON.parse(localStorage.getItem(LAST_COORDS_KEY) ?? 'null') ?? FALLBACK
  );
  readonly addressLabel = signal<string>(
    localStorage.getItem(LAST_LABEL_KEY) ?? 'İstanbul, Levent'
  );
  readonly isManual = signal<boolean>(
    localStorage.getItem(IS_MANUAL_KEY) === 'true'
  );
  readonly status = signal<LocStatus>(
    this.isManual() ? 'manual' : (localStorage.getItem(LAST_COORDS_KEY) ? 'ok' : 'idle')
  );

  /** Konumu alır; manuel seçilmişse onu korur, değilse GPS dener. */
  async locate(forceGps = false): Promise<Coords> {
    if (this.isManual() && !forceGps && this.coords()) {
      this.status.set('manual');
      return this.coords();
    }

    if (!('geolocation' in navigator)) {
      return this.useFallback();
    }

    this.status.set('locating');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.setCoords(c, false);
          this.status.set('ok');
          // Reverse geocoding ile adres etiketini bul
          this.reverseGeocode(c);
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

  setManualLocation(c: Coords, label: string) {
    this.isManual.set(true);
    localStorage.setItem(IS_MANUAL_KEY, 'true');
    this.setCoords(c, true);
    this.setLabel(label);
    this.status.set('manual');
  }

  useGps() {
    this.isManual.set(false);
    localStorage.removeItem(IS_MANUAL_KEY);
    return this.locate(true);
  }

  private setCoords(c: Coords, manual: boolean) {
    this.coords.set(c);
    localStorage.setItem(LAST_COORDS_KEY, JSON.stringify(c));
  }

  private setLabel(label: string) {
    this.addressLabel.set(label);
    localStorage.setItem(LAST_LABEL_KEY, label);
  }

  private useFallback(): Coords {
    this.status.set('fallback');
    this.coords.set(FALLBACK);
    this.setLabel('İstanbul, Levent');
    return FALLBACK;
  }

  /** İl, İlçe ve Mahalle arama (OpenStreetMap Nominatim Geocoder - Ücretsiz & Key gerektirmez) */
  async searchAddress(query: string): Promise<AddressResult[]> {
    if (!query.trim() || query.trim().length < 2) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=tr&addressdetails=1&limit=6&q=${encodeURIComponent(query.trim())}`;
      const results = await firstValueFrom(this.http.get<any[]>(url, {
        headers: { 'Accept-Language': 'tr' }
      }));

      return results.map(item => {
        const addr = item.address || {};
        const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.village;
        const district = addr.town || addr.city_district || addr.county || addr.district;
        const city = addr.province || addr.city || addr.state;

        let parts = [neighborhood, district, city].filter(Boolean);
        let label = parts.length > 0 ? parts.join(', ') : item.display_name.split(',').slice(0, 3).join(',');

        return {
          label: label || item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          city,
          district,
          neighborhood
        };
      });
    } catch {
      return [];
    }
  }

  private async reverseGeocode(c: Coords) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.lat}&lon=${c.lng}&zoom=16&addressdetails=1`;
      const data = await firstValueFrom(this.http.get<any>(url, {
        headers: { 'Accept-Language': 'tr' }
      }));
      if (data?.address) {
        const a = data.address;
        const neighborhood = a.suburb || a.neighbourhood || a.quarter;
        const district = a.town || a.city_district || a.county || a.district;
        const city = a.province || a.city;
        const label = [neighborhood, district, city].filter(Boolean).join(', ');
        if (label) this.setLabel(label);
      }
    } catch {
      // sessizce geç
    }
  }
}
