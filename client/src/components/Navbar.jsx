import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import './navbar.css';

const links = [
  { hash: '#home', label: 'Home' },
  { hash: '#mission', label: 'Our Mission' },
  { hash: '#trip-planner', label: 'Plan a Trip' },
  { hash: '#book-ride', label: 'Book an Eco-Ride' },
  { hash: '#rewards', label: 'Rewards' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout();
      showModal('Logged Out', 'You have been successfully logged out.');
      navigate('/');
    } catch (err) {
      showModal('Logout Failed', err.message);
    }
  };

  // Links point to "/#section" so they also work from /dashboard or /login.
  const navLinks = (onClick) =>
    links.map((l) => (
      <Link key={l.hash} to={`/${l.hash}`} className="nav-link" onClick={onClick}>
        {l.label}
      </Link>
    ));

  return (
    <header className="site-header">
      <nav className="nav">
        <Link to="/" className="brand" onClick={() => window.scrollTo(0, 0)}>Tour4Tomorrow</Link>

        <div className="nav-desktop">
          {navLinks()}
          {user ? (
            <div className="user-menu">
              <Link to="/dashboard" className="welcome-msg" title="My dashboard">
                <i className="fas fa-user-circle" /> {user.name.split(' ')[0]}
              </Link>
              <button className="logout-link" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-green">
              <i className="fas fa-sign-in-alt" /> Login
            </Link>
          )}
        </div>

        <button
          className="menu-btn"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <i className={`fas ${open ? 'fa-times' : 'fa-bars'}`} />
        </button>
      </nav>

      {open && (
        <div className="nav-mobile">
          {navLinks(() => setOpen(false))}
          <div className="divider" />
          <div className="mobile-auth">
            {user ? (
              <>
                <Link to="/dashboard" className="mobile-hi" onClick={() => setOpen(false)}>
                  Hi, {user.name.split(' ')[0]}! · My Dashboard
                </Link>
                <button className="btn btn-red btn-block" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-green btn-block" onClick={() => setOpen(false)}>
                <i className="fas fa-sign-in-alt" /> Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
