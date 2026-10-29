import { transportModes, calculatorModes, EMISSION_FACTORS_SOURCE } from '../config/emissionFactors.js';

// GET /api/carbon/factors (public)
// The React calculator downloads these once, then recalculates instantly as the
// slider moves — no request per slider movement.
export function getFactors(req, res) {
  res.json({
    source: EMISSION_FACTORS_SOURCE,
    unit: 'kg CO2e per person-km (cars: per vehicle-km, shared by occupants)',
    modes: transportModes.map(({ key, name, icon, color, kgPerPassengerKm, kgPerVehicleKm, perVehicle, capacity }) => ({
      key,
      name,
      icon,
      color,
      perVehicle,
      capacity,
      // For the 1-person calculator a car's per-vehicle factor = per-person factor.
      kgPerPersonKm: perVehicle ? kgPerVehicleKm : kgPerPassengerKm,
    })),
    calculatorModes,
  });
}
