import { useState } from 'react';
import { FadeInSection } from './common.jsx';
import CarbonCalculator from './CarbonCalculator.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import './mission.css';

// The three stats from the original page. Wording was tightened so each
// number matches a published source (shown on the back of the card).
const STATS = [
  {
    icon: 'fa-plane-departure',
    theme: 'blue',
    value: 8,
    suffix: '%',
    front: 'of global greenhouse-gas emissions are linked to tourism.',
    backTitle: "Aviation's Impact",
    back: 'A single round-trip flight from New York to London emits nearly as much CO2 per passenger as the average person in some countries produces in an entire year.',
    source: 'Lenzen et al., Nature Climate Change (2018)',
  },
  {
    icon: 'fa-temperature-high',
    theme: 'red',
    value: 10,
    suffix: '',
    front: 'The years 2015–2024 were the 10 warmest ever recorded.',
    backTitle: 'The Earth is Heating Up',
    back: 'This unprecedented warming trend melts glaciers, raises sea levels, and disrupts delicate ecosystems that many tourist destinations depend on.',
    source: 'WMO State of the Global Climate reports',
  },
  {
    icon: 'fa-seedling',
    theme: 'green',
    value: 43,
    suffix: '%',
    front: 'cut in global emissions needed by 2030 (vs 2019) to limit warming to 1.5°C.',
    backTitle: 'We Can Make a Difference',
    back: 'By choosing sustainable options like trains, electric vehicles and eco-certified stays, we can collectively reach this crucial goal and protect our planet for future generations.',
    source: 'IPCC AR6 Synthesis Report (2023)',
  },
];

function FlipCard({ stat, animate }) {
  const n = useCountUp(stat.value, 2000, animate);
  // Hover flips on desktop; tapping toggles on touch screens (hover doesn't exist there).
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      className={`flip-card ${flipped ? 'flipped' : ''}`}
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <i className={`fas ${stat.icon} stat-icon ${stat.theme}`} />
          <p className={`stat-number ${stat.theme}`}>
            {n}
            <span className="stat-suffix">{stat.suffix}</span>
          </p>
          <p className="stat-text">{stat.front}</p>
          <p className="xs muted" style={{ marginTop: '0.5rem' }}>Hover or tap to learn more</p>
        </div>
        <div className={`flip-card-back bg-${stat.theme}`}>
          <h4>{stat.backTitle}</h4>
          <p className="small">{stat.back}</p>
          <p className="xs source">Source: {stat.source}</p>
        </div>
      </div>
    </button>
  );
}

export default function Mission() {
  return (
    <FadeInSection id="mission" className="mission">
      {(visible) => (
        <>
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>🌍 Our Planet, Our Responsibility 🌱</h2>
            <p className="muted" style={{ maxWidth: '48rem', margin: '0 auto' }}>
              Travel is a beautiful part of life, but it has an environmental cost. Understanding this impact is the first
              step towards a solution.
            </p>
          </div>

          <div className="grid-3 flip-grid">
            {STATS.map((s) => (
              <FlipCard key={s.backTitle} stat={s} animate={visible} />
            ))}
          </div>

          <CarbonCalculator />

          <div className="grid-2 problem-solution">
            <div className="card lift">
              <h3 className="ps-title red"><i className="fas fa-smog" /> The Problem of Rising Emissions</h3>
              <p className="muted">
                Every day, conventional travel methods release massive amounts of CO2 into the atmosphere. This pollution
                traps heat, disrupts ecosystems, and directly impacts human health. The consequences are dire, but not
                irreversible if we act now.
              </p>
            </div>
            <div className="card lift solution">
              <h3 className="ps-title"><i className="fas fa-leaf" /> How Tour4Tomorrow Helps</h3>
              <p>We&apos;re dedicated to making sustainable travel accessible. Our platform empowers you to:</p>
              <ul>
                <li>Calculate and compare carbon footprints for trips.</li>
                <li>Choose low-carbon transport and greener places to stay.</li>
                <li>Get personalised advice from our AI travel assistant.</li>
                <li>Save green trip plans and earn Carbon Points.</li>
              </ul>
              <p>Your journey with us is a step towards a healthier planet.</p>
            </div>
          </div>
        </>
      )}
    </FadeInSection>
  );
}
