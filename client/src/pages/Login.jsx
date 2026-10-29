import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import './auth.css';

// Styled like the original login modal ("👋 Welcome Back!").
export default function Login() {
  const { user, login } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      showModal('Login Successful!', 'Welcome back! You can now access all features.');
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
        <h3 className="auth-title">👋 Welcome Back!</h3>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>Log in to manage your sustainable journeys.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input className="input" type="email" placeholder="Email Address" aria-label="Email address" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-green btn-lg btn-block" disabled={busy}>
            {busy ? <span className="loader loader-sm" /> : 'Login'}
          </button>
        </form>
        <p className="small" style={{ marginTop: '1.25rem' }}>
          New to Tour4Tomorrow? <Link to="/register" state={{ from }} className="text-green bold">Create an account</Link>
        </p>
        <Link to="/" className="btn btn-ghost" style={{ marginTop: '0.5rem' }}>Cancel</Link>
      </div>
    </div>
  );
}
