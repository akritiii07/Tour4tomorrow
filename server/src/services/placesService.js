// Real places to stay near a destination, from OpenStreetMap via the free
// Overpass API (no key needed). OSM gives names & locations — NOT prices,
// availability or eco-certification — and the UI says so.
import { fetchWithTimeout } from '../utils/AppError.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const cache = new Map();

export async function findStaysNear({ lat, lon }, radiusMeters = 6000, limit = 12) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key);

  const query = `
    [out:json][timeout:12];
    (
      node["tourism"~"^(hotel|guest_house|hostel|motel)$"]["name"](around:${radiusMeters},${lat},${lon});
      way["tourism"~"^(hotel|guest_house|hostel|motel)$"]["name"](around:${radiusMeters},${lat},${lon});
    );
    out center ${limit * 3};`;

  try {
    const res = await fetchWithTimeout(
      OVERPASS_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
      },
      15000
    );
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const data = await res.json();

    const items = (data.elements || [])
      .map((el) => ({
        osmId: `${el.type}/${el.id}`,
        name: el.tags?.name,
        kind: el.tags?.tourism?.replace('_', ' '),
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
        website: el.tags?.website || el.tags?.['contact:website'] || null,
        stars: el.tags?.stars || null,
      }))
      .filter((s) => s.name && s.lat)
      .slice(0, limit);

    const result = { source: 'openstreetmap', items, error: null };
    if (cache.size > 200) cache.clear();
    cache.set(key, result);
    return result;
  } catch (err) {
    // Overpass is a free community service and is sometimes busy.
    // The trip plan still works — we just show no nearby list.
    console.warn('Overpass lookup failed:', err.message);
    return { source: 'openstreetmap', items: [], error: 'Nearby stays are unavailable right now.' };
  }
}
