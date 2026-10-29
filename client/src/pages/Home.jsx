import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import Mission from '../components/Mission.jsx';
import TripPlanner from '../components/TripPlanner.jsx';
import EcoRide from '../components/EcoRide.jsx';
import Rewards from '../components/Rewards.jsx';

// The single landing page — same section order as the original index.html.
export default function Home() {
  const { hash } = useLocation();

  // React Router doesn't scroll to "#section" automatically, so we do it.
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <>
      <Hero />
      <main className="container main">
        <Mission />
        <TripPlanner />
        <EcoRide />
        <Rewards />
      </main>
    </>
  );
}
