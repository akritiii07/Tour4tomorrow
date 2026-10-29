// ─────────────────────────────────────────────────────────────────────────────
// Emission factors in kg CO2e per PASSENGER-km (per person, per km travelled).
//
// These are APPROXIMATE, rounded values for an educational project, based on
// the kind of averages published in the UK Government (DESNZ) GHG conversion
// factors and India's CEA grid-emission data. Real emissions depend on the
// exact vehicle, occupancy, fuel and electricity grid.
//
// Why keep them here (server-side) instead of in React?
//   One source of truth: the calculator, the trip planner and the AI chatbot
//   all read the SAME numbers, served by GET /api/carbon/factors.
//   If you find better data, change it here and everything updates.
// ─────────────────────────────────────────────────────────────────────────────

export const EMISSION_FACTORS_SOURCE =
  'Approximate averages based on UK DESNZ GHG conversion factors and the India CEA grid ' +
  'emission factor. Educational estimates, not certified carbon accounting.';

export const transportModes = [
  {
    key: 'flight',
    name: 'Short-Haul Flight',
    icon: 'fa-plane',
    color: '#ef4444',
    kgPerPassengerKm: 0.25, // includes a non-CO2 warming uplift, as DESNZ does
    // A per-vehicle mode has its emissions split among passengers.
    perVehicle: false,
    capacity: 180,
    ecoScore: 1.5,
    minKm: 300, // nobody flies 50 km
  },
  {
    key: 'petrolCar',
    name: 'Petrol Car',
    icon: 'fa-car-side',
    color: '#f97316',
    kgPerVehicleKm: 0.17,
    perVehicle: true,
    capacity: 4,
    ecoScore: 2.5,
  },
  {
    key: 'hybridCar',
    name: 'Hybrid Car',
    icon: 'fa-car',
    color: '#eab308',
    kgPerVehicleKm: 0.11,
    perVehicle: true,
    capacity: 4,
    ecoScore: 5.5,
  },
  {
    key: 'evCar',
    name: 'Electric Car',
    icon: 'fa-bolt',
    color: '#22c55e',
    // ~0.15 kWh/km × ~0.71 kg CO2/kWh (Indian grid). EVs are NOT zero-emission
    // unless charged from renewables — the original page assumed 0, we don't.
    kgPerVehicleKm: 0.1,
    perVehicle: true,
    capacity: 4,
    ecoScore: 7.5,
  },
  {
    key: 'bus',
    name: 'CNG / Electric Bus',
    icon: 'fa-bus',
    color: '#14b8a6',
    kgPerPassengerKm: 0.05,
    perVehicle: false,
    capacity: 40,
    ecoScore: 8.5,
  },
  {
    key: 'train',
    name: 'Train',
    icon: 'fa-train',
    color: '#3b82f6',
    kgPerPassengerKm: 0.035,
    perVehicle: false,
    capacity: 1000,
    ecoScore: 9.5,
    minKm: 50,
  },
];

// Used by the simple "Visualize Your Impact" slider (one person, one-way).
export const calculatorModes = ['flight', 'petrolCar', 'train', 'evCar'];

/**
 * CO2 for one person for a given distance.
 * For cars, the car's emissions are shared between the travellers in it.
 */
export function perPersonKg(mode, distanceKm, travelers = 1) {
  if (mode.perVehicle) {
    const vehiclesNeeded = Math.ceil(travelers / mode.capacity);
    return (mode.kgPerVehicleKm * distanceKm * vehiclesNeeded) / travelers;
  }
  return mode.kgPerPassengerKm * distanceKm;
}
