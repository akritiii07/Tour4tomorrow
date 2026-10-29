import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { FadeInSection, Loader, Notice, SourceBadge, formatINR } from './common.jsx';
import './ride.css';

const TYPES = [
  { type: 'all', label: 'All' },
  { type: 'car', label: 'EV Car' },
  { type: 'motorcycle', label: 'EV Bike' },
];

export default function EcoRide() {
  const { user, refreshUser } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState('Bhopal, MP');
  const [dropoff, setDropoff] = useState('');
  const [type, setType] = useState('all');
  const [quote, setQuote] = useState(null); // options returned by the server
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [ride, setRide] = useState(null); // the active (simulated) ride
  const [now, setNow] = useState(Date.now());
  const arrivedShown = useRef(false);

  // On login / page load, resume tracking a ride that's still "on the way".
  // Because the booking is stored in MongoDB, refreshing the page doesn't lose it.
  useEffect(() => {
    if (!user) {
      setRide(null);
      return;
    }
    api('/rides/active')
      .then(({ ride }) => setRide(ride?.status === 'booked' ? ride : null))
      .catch(() => {});
  }, [user]);

  // Tick every second while a ride is active (the live countdown).
  useEffect(() => {
    if (!ride) return undefined;
    arrivedShown.current = false;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ride]);

  const secondsLeft = ride ? Math.max(0, Math.round((new Date(ride.arrivesAt) - now) / 1000)) : 0;

  // When the countdown hits zero: show the "arrived" modal, then reset after 3s.
  useEffect(() => {
    if (!ride || secondsLeft > 0 || arrivedShown.current) return undefined;
    arrivedShown.current = true;
    showModal('Ride Arrived!', `${ride.driver} has arrived at your pickup location. (Simulated demo)`);
    const t = setTimeout(() => {
      setRide(null);
      setQuote(null);
      api('/rides/active').catch(() => {}); // lets the server mark it "arrived"
    }, 3000);
    return () => clearTimeout(t);
  }, [ride, secondsLeft, showModal]);

  async function findRides() {
    if (!pickup.trim() || !dropoff.trim()) {
      showModal('Missing Information', 'Please enter both pickup and drop-off locations.');
      return;
    }
    setLoading(true);
    setError('');
    setQuote(null);
    try {
      setQuote(await api('/rides/options', { query: { pickup, dropoff, type } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function book(option) {
    if (!user) {
      showModal('Login Required', 'Please log in to book a ride and earn rewards.');
      navigate('/login', { state: { from: '/#book-ride' } });
      return;
    }
    setBookingId(option.id);
    try {
      const res = await api('/rides', { method: 'POST', body: { quoteToken: quote.quoteToken, rideId: option.id } });
      setRide(res.ride);
      setNow(Date.now());
      await refreshUser();
    } catch (err) {
      showModal('Booking Failed', err.message);
    } finally {
      setBookingId(null);
    }
  }

  async function cancel() {
    try {
      const res = await api(`/rides/${ride._id}/cancel`, { method: 'POST' });
      setRide(null);
      setQuote(null);
      await refreshUser();
      showModal(
        'Ride Cancelled',
        `Your ride has been successfully cancelled.${res.pointsRemoved ? ` ${res.pointsRemoved} points were reversed.` : ''}`
      );
    } catch (err) {
      showModal('Cancel Failed', err.message);
    }
  }

  return (
    <FadeInSection id="book-ride" className="section">
      <h2 className="section-title">🚗 Need a Quick, Green Ride? 💨</h2>
      <p className="section-sub">
        Just like other ride-sharing apps, but with a conscience — electric and low-emission vehicles only.
      </p>

      <div className="card ride-card">
        <div style={{ marginBottom: '1.25rem' }}>
          <Notice icon="fa-flask">
            <strong>Demo feature:</strong> locations and distances are real, but drivers, ETAs and live tracking are
            simulated. No real vehicle will be sent.
          </Notice>
        </div>

        {!ride ? (
          <div>
            <div className="ride-inputs">
              <input className="input" placeholder="Enter Pickup Location" aria-label="Pickup location" value={pickup} onChange={(e) => setPickup(e.target.value)} />
              <input className="input" placeholder="Enter Drop-off Location" aria-label="Drop-off location" value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
            </div>
            <div className="ride-filter" role="group" aria-label="Vehicle type">
              {TYPES.map((t) => (
                <button key={t.type} type="button" className={`ride-type-btn ${type === t.type ? 'active' : ''}`} onClick={() => setType(t.type)}>
                  {t.label}
                </button>
              ))}
            </div>
            <button className="btn btn-yellow btn-lg btn-block" onClick={findRides} disabled={loading}>
              <i className="fas fa-search-location" /> Find My Eco-Ride
            </button>

            <div className="ride-options">
              {loading && <Loader small />}
              {error && <p className="error-text">❌ {error}</p>}
              {quote && (
                <>
                  <p className="small muted ride-distance">
                    {quote.distanceKm} km trip <SourceBadge source={quote.distanceSource} />
                  </p>
                  {quote.options.length === 0 && <p className="empty">No vehicles of this type available right now.</p>}
                  {quote.options.map((o) => (
                    <div key={o.id} className="ride-option">
                      <div className="ride-left">
                        <div className="ride-icon"><i className={`fas ${o.icon}`} /></div>
                        <div>
                          <p className="bold">{o.driver} in a {o.car}</p>
                          <p className="small muted">ETA: {o.eta} min</p>
                        </div>
                      </div>
                      <div className="ride-right">
                        <p className="bold" style={{ fontSize: '1.125rem' }}>{formatINR(o.fare)}</p>
                        <button className="btn btn-green btn-sm" onClick={() => book(o)} disabled={bookingId === o.id}>
                          {bookingId === o.id ? '…' : 'Book'}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="ride-tracking">
            <h3>✅ Your ride is on the way!</h3>
            <div className="ride-vehicle">
              <i className={`fas ${ride.icon} animate-bounce`} />
            </div>
            <div className="driver-details">
              <p className="bold" style={{ fontSize: '1.125rem' }}>{ride.driver}</p>
              <p className="small muted">{ride.car} · {formatINR(ride.fare)}</p>
            </div>
            <p style={{ fontSize: '1.125rem', marginTop: '1rem' }}>
              Arriving in:{' '}
              <span className="bold text-green">
                {secondsLeft > 0 ? `${Math.floor(secondsLeft / 60)}m ${String(secondsLeft % 60).padStart(2, '0')}s` : 'Arrived!'}
              </span>{' '}
              ⏳
            </p>
            {secondsLeft > 0 && (
              <button className="btn btn-red" style={{ marginTop: '1.5rem', padding: '0.5rem 2rem' }} onClick={cancel}>
                ❌ Cancel Ride
              </button>
            )}
          </div>
        )}
      </div>
    </FadeInSection>
  );
}
