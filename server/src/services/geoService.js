// Geocoding (place name → coordinates) and routing (road distance).
//
// REAL APIs used:
//   • openrouteservice (needs free ORS_API_KEY) — geocoding + driving routes
//   • OpenStreetMap Nominatim (no key)          — geocoding fallback
// If no ORS key is set, road distance is ESTIMATED as straight-line × 1.25 and
// the response says `source: 'estimated'` so the UI can label it.
import { config } from '../config/env.js';
import { AppError, fetchWithTimeout } from '../utils/AppError.js';

const ORS_BASE = 'https://api.openrouteservice.org';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const ROAD_FACTOR = 1.25; // roads are rarely straight

// ── Tiny in-memory cache so repeated searches don't hit the APIs again ──────
const geocodeCache = new Map();
function cacheSet(key, value) {
  if (geocodeCache.size > 500) geocodeCache.delete(geocodeCache.keys().next().value);
  geocodeCache.set(key, value);
}

// Nominatim's policy: max 1 request per second. This queue spaces calls out.
let nominatimChain = Promise.resolve();
function nominatimThrottle() {
  const wait = nominatimChain.then(() => new Promise((r) => setTimeout(r, 1100)));
  nominatimChain = wait;
  return wait;
}

async function geocodeWithORS(text) {
  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set('api_key', config.orsKey);
  url.searchParams.set('text', text);
  url.searchParams.set('size', '1');
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`openrouteservice geocode HTTP ${res.status}`);
  const data = await res.json();
  const f = data.features?.[0];
  if (!f) return null;
  const [lon, lat] = f.geometry.coordinates;
  return { name: f.properties.label || text, lat, lon };
}

async function geocodeWithNominatim(text) {
  await nominatimThrottle();
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', text);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': config.nominatimUserAgent, 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const [hit] = await res.json();
  if (!hit) return null;
  return { name: hit.display_name, lat: Number(hit.lat), lon: Number(hit.lon) };
}

/** Turn a place name into { name, lat, lon }. Throws 404 if not found. */
export async function geocode(text) {
  const key = text.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  let place;
  try {
    place = config.orsKey ? await geocodeWithORS(text) : await geocodeWithNominatim(text);
  } catch (err) {
    console.error('Geocoding failed:', err.message);
    throw new AppError(502, 'The map service is unavailable right now. Please try again shortly.');
  }
  if (!place) throw new AppError(404, `We couldn't find "${text}". Try adding the state or country.`);
  cacheSet(key, place);
  return place;
}

/** Great-circle distance in km (the "as the crow flies" distance). */
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Keep at most ~400 points so we don't send megabytes of coordinates to the browser.
function simplify(coords, max = 400) {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out = coords.filter((_, i) => i % step === 0);
  out.push(coords[coords.length - 1]);
  return out;
}

async function routeWithORS(from, to, profile) {
  const res = await fetchWithTimeout(
    `${ORS_BASE}/v2/directions/${profile}/geojson`,
    {
      method: 'POST',
      headers: { Authorization: config.orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[from.lon, from.lat], [to.lon, to.lat]] }),
    },
    15000
  );
  if (!res.ok) throw new Error(`openrouteservice directions HTTP ${res.status}`);
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('No route found');
  const { distance, duration } = feature.properties.summary;
  return {
    distanceKm: Math.round((distance / 1000) * 10) / 10,
    durationMin: Math.round(duration / 60),
    // GeoJSON is [lon, lat]; Leaflet wants [lat, lon]
    geometry: simplify(feature.geometry.coordinates).map(([lon, lat]) => [lat, lon]),
    source: 'openrouteservice',
  };
}

/**
 * Road distance between two geocoded places.
 * Returns { distanceKm, durationMin|null, geometry|null, source }.
 */
export async function getRoute(from, to, profile = 'driving-car') {
  if (config.orsKey) {
    try {
      return await routeWithORS(from, to, profile);
    } catch (err) {
      // e.g. islands, or a route longer than ORS's free limit → estimate instead
      console.warn('Routing failed, using estimate:', err.message);
    }
  }
  const km = haversineKm(from, to) * ROAD_FACTOR;
  return {
    distanceKm: Math.round(km * 10) / 10,
    durationMin: null,
    geometry: null,
    source: 'estimated',
  };
}
