import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Loader } from './common.jsx';

// "📊 Visualize Your Impact" — the slider calculator from the original page.
// Emission factors come from the backend (GET /api/carbon/factors) so the
// calculator, trip planner and AI chatbot all use the SAME numbers.
export default function CarbonCalculator() {
  const [distance, setDistance] = useState(1000);
  const [factors, setFactors] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/carbon/factors')
      .then(setFactors)
      .catch((err) => setError(err.message));
  }, []);

  const modes = factors ? factors.calculatorModes.map((key) => factors.modes.find((m) => m.key === key)) : [];
  // The biggest emitter fills 100% of the bar width; others are relative to it.
  const max = Math.max(...modes.map((m) => m.kgPerPersonKm * distance), 1);

  return (
    <div className="card calculator">
      <h3 className="calc-title">📊 Visualize Your Impact</h3>
      <p className="muted text-center" style={{ maxWidth: '42rem', margin: '0 auto 2rem' }}>
        See the difference your travel choices make. Adjust the slider to compare a one-way trip for one person.
      </p>
      <div className="calc-body">
        <label htmlFor="distance-slider" className="bold" style={{ color: 'var(--gray-700)' }}>
          Trip Distance: <span className="text-green">{distance} km</span>
        </label>
        <input
          id="distance-slider"
          type="range"
          min="200"
          max="2500"
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
        />

        {error && <p className="error-text">{error}</p>}
        {!factors && !error && <Loader small />}

        <div className="calc-results">
          {modes.map((m) => {
            const kg = m.kgPerPersonKm * distance;
            return (
              <div key={m.key}>
                <div className="calc-row">
                  <span className="calc-mode">
                    <i className={`fas ${m.icon}`} /> {m.name}
                  </span>
                  <span className="bold">{kg.toFixed(1)} kg CO₂</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(1, (kg / max) * 100)}%`, background: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
        {factors && <p className="xs muted" style={{ marginTop: '1rem' }}>ℹ️ {factors.source}</p>}
      </div>
    </div>
  );
}
