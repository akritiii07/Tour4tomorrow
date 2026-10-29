import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { useInView } from '../hooks/useInView.js';
import { formatDate } from './common.jsx';
import './rewards.css';

const RANK_ICONS = ['fa-trophy gold', 'fa-medal silver', 'fa-medal bronze'];

export default function Rewards() {
  const { user } = useAuth();
  const { showModal } = useModal();
  const [ref, visible] = useInView();

  const [tab, setTab] = useState('tiers');
  const [tiers, setTiers] = useState([]);
  const [mine, setMine] = useState(null); // { points, next, pointsToNext, progressPct, history }
  const [board, setBoard] = useState({ entries: [], you: null });
  const prevPoints = useRef(null);

  const points = user ? user.carbonPoints : 0;

  useEffect(() => {
    api('/rewards/tiers').then((d) => setTiers(d.tiers)).catch(() => {});
  }, []);

  // Re-load whenever the user's points change (after saving a trip or booking a ride).
  useEffect(() => {
    api('/rewards/leaderboard').then(setBoard).catch(() => {});
    if (user) api('/rewards/me').then(setMine).catch(() => {});
    else setMine(null);
  }, [user, points]);

  // "Tier Unlocked!" pop-up, exactly like the original.
  useEffect(() => {
    if (!user) {
      prevPoints.current = null;
      return;
    }
    const before = prevPoints.current;
    prevPoints.current = points;
    if (before === null || !tiers.length) return; // first load — don't celebrate old tiers
    const unlocked = tiers.filter((t) => before < t.points && points >= t.points).pop();
    if (unlocked) {
      const t = setTimeout(
        () => showModal('Tier Unlocked!', `Congratulations! You've reached the ${unlocked.name} tier and unlocked: ${unlocked.reward}`),
        1600
      );
      return () => clearTimeout(t);
    }
  }, [user, points, tiers, showModal]);

  const shown = useCountUp(points, 1500, visible);

  let status = 'Log in to start earning points! 📈';
  if (user && mine) {
    status = mine.next
      ? `${mine.pointsToNext} points away from the ${mine.next.name} tier!`
      : "You've reached the highest tier! Keep up the great work!";
  }
  const barPct = user && mine ? mine.progressPct : 0;

  return (
    <section id="rewards" ref={ref} className={`section fade-in-section ${visible ? 'is-visible' : ''}`}>
      <h2 className="section-title" style={{ marginBottom: '1rem' }}>🏆 Your Green Impact Rewards 💚</h2>
      <p className="section-sub">Earn Carbon Points for every sustainable choice you make. Unlock new tiers and climb the leaderboard!</p>

      <div className="card rewards-card">
        <p className="muted" style={{ fontSize: '1.125rem' }}>Your Current Balance</p>
        <p className="points-counter">{shown}</p>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: visible ? `${barPct}%` : 0 }} />
        </div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          {status} {!user && <Link to="/login" className="text-green bold">Log in</Link>}
        </p>

        <div className="rewards-tabs-wrap">
          <div className="rewards-tabs" role="tablist">
            {[
              ['tiers', '🏅 Reward Tiers'],
              ['leaderboard', '📊 Leaderboard'],
              ['history', '📜 Points History'],
            ].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={`reward-tab-btn ${tab === key ? 'active-tab' : ''}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'tiers' && (
            <div className="grid-3 tiers">
              {tiers.map((t) => {
                const unlocked = points >= t.points;
                const progress = unlocked ? 100 : Math.floor((points / t.points) * 100);
                return (
                  <div key={t.name} className={`tier-card ${unlocked ? 'unlocked' : ''}`}>
                    <div className="tier-head">
                      <i className={`fas ${t.icon}`} />
                      <div>
                        <h4>{t.name}</h4>
                        <p className="small muted">{t.points} Points</p>
                      </div>
                    </div>
                    <p className="small tier-reward">{t.reward}</p>
                    <div className="mini-track"><div className="mini-fill" style={{ width: `${progress}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leaderboard' && (
            <>
              {board.entries.length === 0 ? (
                <p className="empty">No one has earned points yet — be the first! 🌱</p>
              ) : (
                <ul className="leaderboard">
                  {board.entries.map((e) => (
                    <li key={e.rank} className={e.isYou ? 'you' : ''}>
                      <span className="rank">
                        {e.rank}
                        {RANK_ICONS[e.rank - 1] && <i className={`fas ${RANK_ICONS[e.rank - 1]}`} />}
                      </span>
                      <span className="lb-name">{e.name}{e.isYou ? ' (You)' : ''}</span>
                      <span className="bold text-green">{e.points.toLocaleString()} pts</span>
                    </li>
                  ))}
                </ul>
              )}
              {board.you && !board.entries.some((e) => e.isYou) && (
                <p className="small muted" style={{ marginTop: '1rem' }}>
                  You are #{board.you.rank} with {board.you.points} pts.
                </p>
              )}
            </>
          )}

          {tab === 'history' &&
            (!user || !mine?.history?.length ? (
              <p className="empty">Your points history will appear here once you complete activities.</p>
            ) : (
              <ul className="history">
                {mine.history.map((h) => (
                  <li key={h._id}>
                    <div>
                      <p style={{ fontWeight: 500 }}>{h.reason}</p>
                      <p className="xs muted">{formatDate(h.createdAt)}</p>
                    </div>
                    <span className={`bold ${h.amount > 0 ? 'text-green' : 'neg'}`}>
                      {h.amount > 0 ? `+${h.amount}` : h.amount}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>
    </section>
  );
}
