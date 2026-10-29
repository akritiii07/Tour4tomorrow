// Builds sustainable trip "packages" = one transport option + one stay style.
// Pure functions (no database, no network) → easy to unit-test.
import { transportModes, perPersonKg } from '../config/emissionFactors.js';
import { stayStyles } from '../data/catalog.js';

const round1 = (n) => Math.round(n * 10) / 10;

export function nightsBetween(startDate, endDate) {
  const ms = new Date(endDate) - new Date(startDate);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Every sensible way to make this journey, with round-trip CO2 per person. */
export function transportOptions(distanceKm, travelers) {
  const petrol = transportModes.find((m) => m.key === 'petrolCar');
  const petrolKg = perPersonKg(petrol, distanceKm * 2, travelers);

  return transportModes
    .filter((m) => !m.minKm || distanceKm >= m.minKm)
    .map((m) => {
      const co2 = perPersonKg(m, distanceKm * 2, travelers); // there and back
      return {
        key: m.key,
        name: m.name,
        icon: m.icon,
        ecoScore: m.ecoScore,
        co2PerPersonKg: round1(co2),
        co2SavedVsPetrolKg: round1(Math.max(0, petrolKg - co2)),
        vehiclesNeeded: m.perVehicle ? Math.ceil(travelers / m.capacity) : null,
      };
    })
    .sort((a, b) => a.co2PerPersonKg - b.co2PerPersonKg);
}

/** Stay styles whose cheapest price fits the budget, with an estimated total. */
export function stayOptions(maxBudgetPerNight, nights, travelers) {
  const rooms = Math.ceil(travelers / 2); // assume 2 guests per room
  return stayStyles
    .filter((s) => s.priceRange[0] <= maxBudgetPerNight)
    .map((s) => {
      const low = s.priceRange[0];
      const high = Math.min(s.priceRange[1], maxBudgetPerNight);
      return {
        key: s.key,
        name: s.name,
        description: s.description,
        ecoScore: s.ecoScore,
        estNightlyLow: low,
        estNightlyHigh: high,
        rooms,
        estTotalLow: low * nights * rooms,
        estTotalHigh: high * nights * rooms,
      };
    });
}

/** Combined eco score — same 60% transport / 40% stay weighting as the original page. */
export function combinedEcoScore(transport, stay) {
  return round1(transport.ecoScore * 0.6 + stay.ecoScore * 0.4);
}

export function buildPackages({ distanceKm, travelers, nights, maxBudgetPerNight }, limit = 4) {
  const transports = transportOptions(distanceKm, travelers);
  const stays = stayOptions(maxBudgetPerNight, nights, travelers);

  const packages = [];
  for (const transport of transports) {
    for (const stay of stays) {
      packages.push({
        id: `${transport.key}__${stay.key}`,
        transport,
        stay,
        ecoScore: combinedEcoScore(transport, stay),
      });
    }
  }
  packages.sort((a, b) => b.ecoScore - a.ecoScore || a.transport.co2PerPersonKg - b.transport.co2PerPersonKg);

  return { transports, stays, packages: packages.slice(0, limit) };
}
