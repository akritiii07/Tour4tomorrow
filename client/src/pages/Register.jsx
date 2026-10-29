import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import './auth.css';

export default function Register() {
  const { user, register } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const update = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    // Quick checks in the browser for a nicer experience. The server checks
    // everything again — never rely on frontend validation for security.
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      showModal('Account Created Successfully!', 'Welcome to Tour4Tomorrow! Start planning green trips to earn Carbon Points.');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h3 className="auth-title">🌱 Join Tour4Tomorrow</h3>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>Create an account to save trips and earn rewards.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input className="input" placeholder="Your Name" aria-label="Name" autoComplete="name" required minLength={2} maxLength={50} value={form.name} onChange={update('name')} />
          <input className="input" type="email" placeholder="Email Address" aria-label="Email address" autoComplete="email" required value={form.email} onChange={update('email')} />
          <input className="input" type="password" placeholder="Password (8+ chars, a letter & a number)" aria-label="Password" autoComplete="new-password" required value={form.password} onChange={update('password')} />
          <input className="input" type="password" placeholder="Confirm Password" aria-label="Confirm password" autoComplete="new-password" required value={form.confirm} onChange={update('confirm')} />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-green btn-lg btn-block" disabled={busy}>
            {busy ? <span className="loader loader-sm" /> : 'Create Account'}
          </button>
        </form>
        <p className="small" style={{ marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" state={{ from }} className="text-green bold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
