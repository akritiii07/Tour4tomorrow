// Small reusable building blocks.
import { useInView } from '../hooks/useInView.js';

export function Loader({ small = false }) {
  return (
    <div className="loader-wrap" role="status">
      <span className={`loader ${small ? 'loader-sm' : ''}`} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// A <section> that fades in when scrolled into view (original .fade-in-section).
// `onVisible` lets a section start its own animation (e.g. count-up numbers).
export function FadeInSection({ id, className = '', children }) {
  const [ref, visible] = useInView();
  return (
    <section id={id} ref={ref} className={`fade-in-section ${visible ? 'is-visible' : ''} ${className}`}>
      {typeof children === 'function' ? children(visible) : children}
    </section>
  );
}

// Yellow box used everywhere data is estimated or simulated — honesty first.
export function Notice({ icon = 'fa-circle-info', children }) {
  return (
    <div className="notice">
      <i className={`fas ${icon}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function SourceBadge({ source }) {
  if (source === 'openrouteservice') return <span className="badge badge-real"><i className="fas fa-route" /> Real road route</span>;
  if (source === 'openstreetmap') return <span className="badge badge-real"><i className="fas fa-map" /> OpenStreetMap</span>;
  if (source === 'simulated') return <span className="badge badge-sim"><i className="fas fa-flask" /> Simulated demo</span>;
  return <span className="badge badge-estimate"><i className="fas fa-ruler" /> Estimated</span>;
}

export const formatINR = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
