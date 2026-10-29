import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="container" style={{ padding: '10rem 1.5rem 6rem', textAlign: 'center' }}>
      <p style={{ fontSize: '4rem' }}>🧭</p>
      <h1 className="section-title">This trail doesn&apos;t exist</h1>
      <Link to="/" className="btn btn-green">Back to Tour4Tomorrow</Link>
    </main>
  );
}
