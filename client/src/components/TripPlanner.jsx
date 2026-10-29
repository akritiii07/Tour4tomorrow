import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { FadeInSection, Loader } from './common.jsx';
import TripResults from './TripResults.jsx';
import './planner.css';

// Local YYYY-MM-DD (the original used toISOString(), which is UTC and can be
// off by a day in India late at night).
function isoLocal(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TripPlanner() {
  const { user, refreshUser } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();

  // One state object for the whole form ("controlled inputs").
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    travelers: '',
    startDate: isoLocal(1),
    endDate: isoLocal(5),
    maxBudgetPerNight: 10000,
  });
  const [plan, setPlan] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handlePlan(e) {
    e.preventDefault();
    if (!form.origin.trim() || !form.destination.trim() || !form.startDate || !form.endDate) {
      showModal('Missing Information', 'Please fill in all fields, including origin, destination, and dates.');
      return;
    }
    if (form.endDate <= form.startDate) {
      showModal('Invalid Dates', 'The end date must be after the start date.');
      return;
    }
    const query = { ...form, travelers: Number(form.travelers) || 1, maxBudgetPerNight: Number(form.maxBudgetPerNight) };
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      setPlan(await api('/trips/plan', { method: 'POST', body: query }));
      setLastQuery(query);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(pkg) {
    if (!user) {
      showModal('Login Required', 'Please log in to save a trip plan and earn rewards.');
      navigate('/login', { state: { from: '/#trip-planner' } });
      return;
    }
    setSavingId(pkg.id);
    try {
      const res = await api('/trips', {
        method: 'POST',
        body: { ...lastQuery, transportKey: pkg.transport.key, stayKey: pkg.stay.key },
      });
      await refreshUser(); // points changed → navbar / rewards update
      showModal(
        'Plan Saved Successfully!',
        res.pointsAwarded > 0
          ? `"${pkg.transport.name} + ${pkg.stay.name}" is saved to your dashboard. You earned ${res.pointsAwarded} Carbon Points!`
          : `Your plan is saved. You've reached today's points limit, so no points were added this time.`
      );
    } catch (err) {
      showModal('Save Failed', err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <FadeInSection id="trip-planner" className="section planner">
      <h2 className="section-title">✈️ Plan Your Low-Carbon Trip 🗺️</h2>

      <form className="planner-form" onSubmit={handlePlan} noValidate>
        <div className="grid-3 planner-row">
          <input className="input" placeholder="Origin (e.g., Bhopal)" aria-label="Origin" value={form.origin} onChange={update('origin')} maxLength={120} />
          <input className="input" placeholder="Destination (e.g., Indore)" aria-label="Destination" value={form.destination} onChange={update('destination')} maxLength={120} />
          <input className="input" type="number" min="1" max="20" placeholder="# of Travelers" aria-label="Number of travelers" value={form.travelers} onChange={update('travelers')} />
        </div>
        <div className="grid-2 planner-row">
          <div>
            <label className="label" htmlFor="start-date">Start Date</label>
            <input id="start-date" className="input" type="date" min={isoLocal(0)} value={form.startDate} onChange={update('startDate')} />
          </div>
          <div>
            <label className="label" htmlFor="end-date">End Date</label>
            <input id="end-date" className="input" type="date" min={form.startDate} value={form.endDate} onChange={update('endDate')} />
          </div>
        </div>
        <div className="planner-row">
          <label className="label" htmlFor="budget-slider">
            Max Stay Budget per Night: <span className="text-green bold">₹{Number(form.maxBudgetPerNight).toLocaleString('en-IN')}</span>
          </label>
          <input id="budget-slider" type="range" min="3000" max="20000" step="500" value={form.maxBudgetPerNight} onChange={update('maxBudgetPerNight')} />
        </div>
        <div className="text-center">
          <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
            <i className="fas fa-paper-plane" /> {loading ? 'Finding…' : 'Find Eco-Packages'}
          </button>
        </div>
      </form>

      <div className="trip-results">
        {loading && <Loader />}
        {error && <p className="error-text">❌ {error}</p>}
        {plan && <TripResults plan={plan} onSave={handleSave} savingId={savingId} />}
      </div>
    </FadeInSection>
  );
}
