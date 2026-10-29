// Static catalog data. Anything in this file that is NOT real-world data is
// marked with `simulated: true` so the UI can label it honestly.

// ── Reward tiers (same as the original index.html) ──────────────────────────
export const rewardTiers = [
  { name: 'Bronze Planter', points: 100, reward: '5% off your next trip package!', icon: 'fa-seedling' },
  { name: 'Silver Forester', points: 250, reward: '10% off + a free eco-ride!', icon: 'fa-tree' },
  { name: 'Gold Guardian', points: 500, reward: '15% off + exclusive partner deals!', icon: 'fa-shield-alt' },
];

// ── Accommodation STYLES (not real hotels) ──────────────────────────────────
// The original page invented hotels like "Eco-Haven Resort" with exact prices.
// There is no free, public API with live hotel prices, so instead of faking
// specific hotels we offer accommodation *styles* with a typical price RANGE
// (₹ per night, India, mid-2020s ballpark). Real nearby places to stay come
// from OpenStreetMap (see services/placesService.js) — names only, no prices.
export const staySimulated = true;
export const stayStyles = [
  {
    key: 'certified-eco',
    name: 'Certified Eco-Hotel',
    description: 'Look for IGBC / LEED / GreenLeaf / EarthCheck certification, renewable power and water recycling.',
    priceRange: [9000, 16000],
    ecoScore: 9.5,
  },
  {
    key: 'homestay',
    name: 'Local Homestay',
    description: 'Small, family-run stay. Low energy use per guest and money stays in the local community.',
    priceRange: [2000, 5000],
    ecoScore: 9.0,
  },
  {
    key: 'eco-lodge',
    name: 'Eco-Lodge',
    description: 'Locally sourced materials, farm-to-table food, limited air-conditioning.',
    priceRange: [6000, 10000],
    ecoScore: 8.5,
  },
  {
    key: 'green-practice',
    name: 'Hotel with Green Practices',
    description: 'Standard hotel with recycling, towel-reuse and LED lighting programmes.',
    priceRange: [4000, 8000],
    ecoScore: 7.0,
  },
  {
    key: 'standard',
    name: 'Standard City Hotel',
    description: 'Basic energy-saving measures only.',
    priceRange: [3000, 6000],
    ecoScore: 5.5,
  },
];

// ── Eco-ride fleet — SIMULATED DEMO ─────────────────────────────────────────
// Tour4Tomorrow is not connected to a real ride-hailing network, so drivers,
// ETAs and tracking are simulated. Fares use the original page's formula.
export const rideSimulated = true;
export const rideFleet = [
  { id: 'aisha-model3', driver: 'Aisha', car: 'Tesla Model 3', eta: 3, icon: 'fa-car', type: 'car', baseFare: 80, perKmRate: 12 },
  { id: 'rohan-ather', driver: 'Rohan', car: 'Ather 450X', eta: 2, icon: 'fa-motorcycle', type: 'motorcycle', baseFare: 40, perKmRate: 8 },
  { id: 'priya-nexon', driver: 'Priya', car: 'Tata Nexon EV', eta: 5, icon: 'fa-car', type: 'car', baseFare: 75, perKmRate: 11 },
];

// ── Points rules ────────────────────────────────────────────────────────────
export const POINTS = {
  RIDE_BOOKED: 10,
  // Saving a trip plan earns ecoScore × 5 (same formula as the original page).
  tripPlan: (ecoScore) => Math.round(ecoScore * 5),
};
