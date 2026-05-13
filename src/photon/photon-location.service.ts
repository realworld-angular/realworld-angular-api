import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

const PHOTON_URL = 'https://photon.komoot.io/api/';
const FETCH_TIMEOUT_MS = 10_000;
const SEARCH_LIMIT = 25;

export interface PhotonProperties {
  name?: string;
  city?: string;
  town?: string;
  village?: string;
  locality?: string;
  district?: string;
  county?: string;
  country?: string;
  type?: string;
}

interface PhotonFeature {
  properties?: PhotonProperties;
}

interface PhotonGeoJson {
  features?: PhotonFeature[];
}

/**
 * Parses a single-line address built as `{street}, {city}, {country}` with comma+space separators
 * (same format as checkout). Street may itself contain commas.
 */
export function parseCommaJoinedStreetCityCountry(line: string): {
  street: string;
  city: string;
  country: string;
} {
  const trimmed = line.trim();
  const parts = trimmed
    .split(', ')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    throw new BadRequestException(
      'Address must include street, city, and country (use the location picker values for city and country).',
    );
  }
  const country = parts[parts.length - 1];
  const city = parts[parts.length - 2];
  const street = parts.slice(0, -2).join(', ');
  return { street, city, country };
}

@Injectable()
export class PhotonLocationService {
  private normalizeLocationPart(s: string): string {
    return s.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private pickCity(p: PhotonProperties): string {
    const fromAdmin = (
      p.city ??
      p.town ??
      p.village ??
      p.locality ??
      p.district ??
      p.county ??
      ''
    ).trim();
    if (fromAdmin) return fromAdmin;
    const t = (p.type ?? '').toLowerCase();
    const n = (p.name ?? '').trim();
    if (
      n &&
      (t === 'city' ||
        t === 'town' ||
        t === 'village' ||
        t === 'locality' ||
        t === 'district')
    ) {
      return n;
    }
    return n;
  }

  private toCityCountry(
    feature: PhotonFeature,
  ): { city: string; country: string } | null {
    const p = feature.properties ?? {};
    const city = this.pickCity(p);
    const country = (p.country ?? '').trim();
    if (!city || !country) return null;
    return { city, country };
  }

  private pairsMatch(
    found: { city: string; country: string },
    expectedCity: string,
    expectedCountry: string,
  ): boolean {
    return (
      this.normalizeLocationPart(found.city) ===
        this.normalizeLocationPart(expectedCity) &&
      this.normalizeLocationPart(found.country) ===
        this.normalizeLocationPart(expectedCountry)
    );
  }

  /**
   * Calls Photon with `city, country` and requires at least one result whose OSM-derived
   * city and country match the submitted values (same rules as the Angular Photon picker).
   */
  async verifyCityCountry(city: string, country: string): Promise<void> {
    const c = city.trim();
    const co = country.trim();
    if (!c || !co) {
      throw new BadRequestException(
        'City and country are required for address verification.',
      );
    }
    const q = `${c}, ${co}`;
    const url = new URL(PHOTON_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('limit', String(SEARCH_LIMIT));

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new ServiceUnavailableException(
          'Could not verify the city and country (geocoding service error).',
        );
      }
      const doc = (await res.json()) as PhotonGeoJson;
      for (const f of doc.features ?? []) {
        const pair = this.toCityCountry(f);
        if (pair && this.pairsMatch(pair, c, co)) {
          return;
        }
      }
      throw new BadRequestException(
        'City and country could not be verified against location data. Choose values from the address suggestions.',
      );
    } catch (e) {
      if (
        e instanceof BadRequestException ||
        e instanceof ServiceUnavailableException
      ) {
        throw e;
      }
      if (e instanceof Error && e.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'Address verification timed out.',
        );
      }
      throw new ServiceUnavailableException('Address verification failed.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
