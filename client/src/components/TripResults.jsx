import { lazy, Suspense } from 'react';
import { Loader, Notice, SourceBadge, formatINR } from './common.jsx';

// The map library is fairly big, so it is loaded only when results appear
// ("code splitting" with React.lazy).
const RouteMap = lazy(() => import('./RouteMap.jsx'));

const scoreClass = (s) => (s >= 8.5 ? 'score-high' : s >= 7 ? 'score-mid' : 'score-low');

export default function TripResults({ plan, onSave, savingId }) {
  const maxCo2 = Math.max(...plan.transports.map((t) => t.co2PerPersonKg), 1);
  const shortName = (name) => name.split(',')[0];

  return (
    <div className="results">
      {/* Summary */}
      <div className="trip-summary card">
        <div>
          <p className="bold" style={{ fontSize: '1.125rem' }}>
            {shortName(plan.origin.name)} <i className="fas fa-arrow-right muted" /> {shortName(plan.destination.name)}
          </p>
          <p className="small muted">
            {plan.distanceKm} km each way{plan.durationMin ? ` · ~${Math.floor(plan.durationMin / 60)}h ${plan.durationMin % 60}m by road` : ''} ·{' '}
            {plan.nights} night{plan.nights > 1 ? 's' : ''} · {plan.travelers} traveller{plan.travelers > 1 ? 's' : ''}
          </p>
        </div>
        <SourceBadge source={plan.distanceSource} />
      </div>

      <Suspense fallback={<Loader small />}>
        <RouteMap origin={plan.origin} destination={plan.destination} geometry={plan.routeGeometry} />
      </Suspense>

      {/* Packages — same card layout as the original */}
      <h3 className="results-title">Top Sustainable Packages</h3>
      {plan.packages.length === 0 ? (
        <p className="empty">No packages found. Try increasing your budget.</p>
      ) : (
        <div className="grid-2">
          {plan.packages.map((pkg) => (
            <div key={pkg.id} className="package-card">
              <div className="package-head">
                <h4>{pkg.transport.name} + {pkg.stay.name}</h4>
                <span className={`score ${scoreClass(pkg.ecoScore)}`} title="Eco score out of 10">
                  <i className="fas fa-leaf" /> {pkg.ecoScore}
                </span>
              </div>
              <p className="small muted">{plan.nights} nights stay · {pkg.stay.rooms} room{pkg.stay.rooms > 1 ? 's' : ''}</p>
              <p className="small" style={{ marginTop: '0.5rem', color: 'var(--gray-600)' }}>{pkg.stay.description}</p>
              <div className="package-stats">
                <div className="stat-box green">
                  <p className="small">CO₂ per person (round trip)</p>
                  <p className="bold">{pkg.transport.co2PerPersonKg} kg</p>
                </div>
                <div className="stat-box blue">
                  <p className="small">Est. stay cost</p>
                  <p className="bold">{formatINR(pkg.stay.estTotalLow)}–{formatINR(pkg.stay.estTotalHigh)}</p>
                </div>
              </div>
              {pkg.transport.co2SavedVsPetrolKg > 0 && (
                <p className="xs text-green" style={{ marginTop: '0.5rem' }}>
                  🌱 Saves ~{pkg.transport.co2SavedVsPetrolKg} kg CO₂ per person vs. driving a petrol car
                </p>
              )}
              <button className="btn btn-green btn-rect btn-block" style={{ marginTop: '1.25rem' }} onClick={() => onSave(pkg)} disabled={savingId === pkg.id}>
                {savingId === pkg.id ? 'Saving…' : 'Save This Plan & Earn Points'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Notice icon="fa-triangle-exclamation">
        <strong>Estimates only.</strong> {plan.notes.stays} Tour4Tomorrow does not book tickets or rooms — saving a plan
        stores it in your dashboard. {plan.notes.distance}
      </Notice>

      {/* Every transport option compared */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="results-sub">Compare every way to get there</h3>
        <div className="calc-results">
          {plan.transports.map((t) => (
            <div key={t.key}>
              <div className="calc-row">
                <span className="calc-mode"><i className={`fas ${t.icon}`} /> {t.name}</span>
                <span className="bold">{t.co2PerPersonKg} kg CO₂ / person</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(1, (t.co2PerPersonKg / maxCo2) * 100)}%`, background: t.co2PerPersonKg === maxCo2 ? 'var(--red-500)' : 'var(--green-500)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real places from OpenStreetMap */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="stays-head">
          <h3 className="results-sub">Places to stay near {shortName(plan.destination.name)}</h3>
          <SourceBadge source="openstreetmap" />
        </div>
        <p className="small muted" style={{ marginBottom: '1rem' }}>
          Real listings from OpenStreetMap. Prices, availability and eco-certification are not included — check with the
          property directly and look for green certifications.
        </p>
        {plan.nearbyStays.error && <p className="small muted">{plan.nearbyStays.error}</p>}
        {!plan.nearbyStays.error && plan.nearbyStays.items.length === 0 && <p className="small muted">No mapped accommodation found nearby.</p>}
        <ul className="stays-list">
          {plan.nearbyStays.items.map((s) => (
            <li key={s.osmId}>
              <i className="fas fa-hotel muted" />
              <div>
                <p className="bold small">{s.name}</p>
                <p className="xs muted" style={{ textTransform: 'capitalize' }}>
                  {s.kind}{s.stars ? ` · ${s.stars}★` : ''}
                  {s.website && (
                    <>
                      {' · '}
                      <a href={s.website} target="_blank" rel="noopener noreferrer nofollow" className="text-green">website</a>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
