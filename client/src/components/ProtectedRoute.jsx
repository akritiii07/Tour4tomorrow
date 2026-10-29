import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader } from './common.jsx';

// Wrap any page that requires login. While we're still checking the session we
// show a spinner (otherwise a logged-in user would be wrongly bounced to /login).
// NOTE: this only protects the UI. The REAL protection is requireAuth on the
// server — a hidden page is not a secure page.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ paddingTop: '8rem' }}><Loader /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
