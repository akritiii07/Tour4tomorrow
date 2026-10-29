import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { Loader, SourceBadge, formatDate, formatINR } from '../components/common.jsx';
import './dashboard.css';

// Protected page (see ProtectedRoute in App.jsx): everything here comes from
// MongoDB and belongs only to the logged-in user.
export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { showModal } = useModal();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [trips, rides, rewards] = await Promise.all([api('/trips'), api('/rides'), api('/rewards/me')]);
      setData({ trips: trips.trips, rides: rides.rides, rewards });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [user?.carbonPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteTrip(id) {
    if (!window.confirm('Delete this trip plan? Points earned from it will be reversed.')) return;
    try {
      await api(`/trips/${id}`, { method: 'DELETE' });
      await refreshUser();
      await load();
    } catch (err) {
      showModal('Delete Failed', err.message);
    }
  }

  if (error) return <main className="container dash"><p className="error-text">❌ {error}</p></main>;
  if (!data) return <main className="container dash"><Loader /></main>;

  const co2Saved = data.trips.reduce((sum, t) => sum + (t.co2SavedVsPetrolKg || 0) * t.travelers, 0);
  const { rewards } = data;

  return (
    <main className="container dash">
      <h1 className="dash-title">Hi, {user.name.split(' ')[0]} 👋</h1>
      <p className="muted">Your sustainable travel dashboard</p>

      <div className="dash-stats">
        <div className="dash-stat"><p className="dash-num text-green">{user.carbonPoints}</p><p className="small muted">Carbon Points</p></div>
        <div className="dash-stat"><p className="dash-num">{rewards.current?.name || '—'}</p><p className="small muted">Current tier{rewards.next ? ` · ${rewards.pointsToNext} pts to ${rewards.next.name}` : ''}</p></div>
        <div className="dash-stat"><p className="dash-num">{data.trips.length}</p><p className="small muted">Saved trip plans</p></div>
        <div className="dash-stat"><p className="dash-num text-green">{co2Saved.toFixed(0)} kg</p><p className="small muted">CO₂ avoided vs. petrol car (est.)</p></div>
      </div>

      <section className="card dash-section">
        <div className="dash-head">
          <h2>🗺️ My Trip Plans</h2>
          <Link to="/#trip-planner" className="btn btn-green btn-sm">+ Plan a trip</Link>
        </div>
        {data.trips.length === 0 ? (
          <p className="empty">No saved trips yet.</p>
        ) : (
          <ul className="dash-list">
            {data.trips.map((t) => (
              <li key={t._id}>
                <div>
                  <p className="bold">{t.origin.name.split(',')[0]} → {t.destination.name.split(',')[0]}</p>
                  <p className="small muted">
                    {formatDate(t.startDate)} – {formatDate(t.endDate)} · {t.travelers} traveller(s) · {t.distanceKm} km <SourceBadge source={t.distanceSource} />
                  </p>
                  <p className="small">
                    {t.transport.name} ({t.transport.co2PerPersonKg} kg CO₂/person) + {t.stay.name} ({formatINR(t.stay.estNightlyLow)}–{formatINR(t.stay.estNightlyHigh)}/night est.)
                  </p>
                </div>
                <div className="dash-actions">
                  <span className="badge badge-real"><i className="fas fa-leaf" /> {t.ecoScore}</span>
                  <span className="small text-green">+{t.pointsAwarded} pts</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteTrip(t._id)} aria-label="Delete trip"><i className="fas fa-trash" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card dash-section">
        <div className="dash-head">
          <h2>🚗 My Eco-Rides <SourceBadge source="simulated" /></h2>
        </div>
        {data.rides.length === 0 ? (
          <p className="empty">No rides yet.</p>
        ) : (
          <ul className="dash-list">
            {data.rides.map((r) => (
              <li key={r._id}>
                <div>
                  <p className="bold">{r.driver} · {r.car}</p>
                  <p className="small muted">{r.pickup.name.split(',')[0]} → {r.dropoff.name.split(',')[0]} · {r.distanceKm} km · {formatDate(r.createdAt)}</p>
                </div>
                <div className="dash-actions">
                  <span className={`badge ${r.status === 'cancelled' ? 'badge-estimate' : 'badge-real'}`}>{r.status}</span>
                  <span className="small">{formatINR(r.fare)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card dash-section">
        <div className="dash-head"><h2>📜 Points History</h2></div>
        {rewards.history.length === 0 ? (
          <p className="empty">No points yet.</p>
        ) : (
          <ul className="dash-list">
            {rewards.history.map((h) => (
              <li key={h._id}>
                <div><p>{h.reason}</p><p className="xs muted">{formatDate(h.createdAt)}</p></div>
                <span className={`bold ${h.amount > 0 ? 'text-green' : 'neg'}`}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
