export default function Footer() {
  return (
    <footer style={{ background: 'var(--gray-800)', color: '#fff', padding: '2rem 0' }}>
      <div className="container text-center">
        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green-400)', marginBottom: '0.5rem' }}>Tour4Tomorrow</p>
        <p>
          &copy; {new Date().getFullYear()} Tour4Tomorrow. All Rights Reserved. Traveling responsibly for a brighter future. 🌍💚
        </p>
        <p className="xs" style={{ color: 'var(--gray-400)', marginTop: '0.75rem' }}>
          Maps © OpenStreetMap contributors · Routing by openrouteservice · Emission figures are estimates.
        </p>
      </div>
    </footer>
  );
}
