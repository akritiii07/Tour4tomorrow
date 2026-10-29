import { useEffect, useState } from 'react';
import './hero.css';

const SUBTITLE = 'Making conscious travel choices to protect our planet.';

export default function Hero() {
  // Same trick as the original: insert the subtitle after 1s so the CSS
  // typing animation starts once the page has loaded.
  const [showSubtitle, setShowSubtitle] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowSubtitle(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="home" className="hero">
      <div className="hero-inner">
        <h1 className="hero-title">Travel Sustainably, Secure Tomorrow</h1>
        <p className="hero-subtitle-container">
          {showSubtitle && <span className="hero-subtitle">{SUBTITLE}</span>}
        </p>
        <a href="#trip-planner" className="btn btn-white hero-cta">
          Start Planning Your Green Trip 🚀
        </a>
      </div>
    </section>
  );
}
