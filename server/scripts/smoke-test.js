// End-to-end smoke test against a RUNNING server with a REAL MongoDB.
//   1. Start the API:   npm run dev
//   2. In another terminal:   npm run smoke
// It creates a throwaway user, exercises every feature, then cleans up its trip.
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let cookie = '';
let failures = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

function check(label, cond, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
}

const iso = (d) => d.toISOString().slice(0, 10);
const start = new Date(Date.now() + 2 * 86400000);
const end = new Date(Date.now() + 5 * 86400000);
const trip = { origin: 'Bhopal', destination: 'Indore', startDate: iso(start), endDate: iso(end), travelers: 2, maxBudgetPerNight: 10000 };

const email = `smoke_${Date.now()}@example.com`;
let r = await call('POST', '/auth/register', { name: 'Smoke Tester', email, password: 'GreenTravel123' });
check('register', r.status === 201, r.data?.error);

r = await call('GET', '/auth/me');
check('me (cookie session works)', r.status === 200 && r.data.user.email === email);

r = await call('POST', '/trips/plan', trip);
check('plan trip', r.status === 200 && r.data.packages?.length > 0, r.data?.error || `${r.data.distanceKm} km (${r.data.distanceSource}), ${r.data.nearbyStays?.items?.length ?? 0} OSM stays`);
const pkg = r.data?.packages?.[0];

if (pkg) {
  r = await call('POST', '/trips', { ...trip, transportKey: pkg.transport.key, stayKey: pkg.stay.key });
  check('save trip + points', r.status === 201 && r.data.pointsAwarded > 0, `${r.data?.pointsAwarded} pts`);
  var tripId = r.data?.trip?._id;
}

r = await call('GET', '/rides/options?pickup=MP Nagar, Bhopal&dropoff=Bhopal Junction&type=all');
check('ride options', r.status === 200 && r.data.options?.length === 3, r.data?.error);
if (r.status === 200) {
  const b = await call('POST', '/rides', { quoteToken: r.data.quoteToken, rideId: r.data.options[0].id });
  check('book simulated ride', b.status === 201, b.data?.error);
  const a = await call('GET', '/rides/active');
  check('active ride', a.data?.ride?.status === 'booked');
  const c = await call('POST', `/rides/${b.data.ride._id}/cancel`);
  check('cancel ride reverses points', c.status === 200 && c.data.pointsRemoved === 10);
}

r = await call('GET', '/rewards/me');
check('rewards/me', r.status === 200 && Array.isArray(r.data.history), `${r.data?.points} pts, ${r.data?.history?.length} history rows`);
r = await call('GET', '/rewards/leaderboard');
check('leaderboard', r.status === 200 && r.data.you, `you are #${r.data?.you?.rank}`);

r = await call('GET', '/chat/status');
if (r.data.configured) {
  const c = await call('POST', '/chat', { message: 'In one sentence: train or car from Bhopal to Indore for 2 people?' });
  check(`AI chat (${r.data.provider})`, c.status === 200 && c.data.reply?.content, c.data?.error || c.data.reply.content.slice(0, 120));
} else {
  console.log(`⚠️  AI chat skipped — no API key for "${r.data.provider}" in server/.env`);
}

if (tripId) {
  r = await call('DELETE', `/trips/${tripId}`);
  check('delete trip', r.status === 200);
}
r = await call('POST', '/auth/logout');
check('logout', r.status === 200);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed 🎉');
process.exit(failures ? 1 : 0);
