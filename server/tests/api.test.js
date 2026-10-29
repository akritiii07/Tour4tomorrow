// Tests that run WITHOUT MongoDB or API keys:  npm test
// They check routing, validation, auth protection, the trip-planner maths and
// the exact requests sent to the AI providers (using a fake fetch).
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import { buildPackages, transportOptions, nightsBetween } from '../src/services/tripPlanner.js';
import { generateReply } from '../src/services/llmService.js';
import { tierInfo } from '../src/services/pointsService.js';

const app = createApp();

describe('public API', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  test('GET /api/carbon/factors returns calculator modes', async () => {
    const res = await request(app).get('/api/carbon/factors');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.calculatorModes, ['flight', 'petrolCar', 'train', 'evCar']);
    assert.ok(res.body.modes.every((m) => m.kgPerPersonKm > 0));
  });

  test('GET /api/rewards/tiers', async () => {
    const res = await request(app).get('/api/rewards/tiers');
    assert.equal(res.body.tiers.length, 3);
  });

  test('unknown route → 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.match(res.body.error, /Route not found/);
  });

  test('chat status reports not configured without a key', async () => {
    const res = await request(app).get('/api/chat/status');
    assert.equal(res.body.configured, false);
  });
});

describe('validation', () => {
  test('register rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'asha@example.com', password: 'short' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least 8/);
  });

  test('register rejects bad email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'not-an-email', password: 'longpassword1' });
    assert.equal(res.status, 400);
  });

  test('NoSQL-injection style object is rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'x' });
    assert.equal(res.status, 400);
  });

  test('trip plan rejects end date before start', async () => {
    const res = await request(app).post('/api/trips/plan').send({
      origin: 'Bhopal', destination: 'Indore', travelers: 2, maxBudgetPerNight: 8000,
      startDate: '2099-01-10', endDate: '2099-01-05',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /end date must be after/);
  });

  test('malformed JSON → 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    assert.equal(res.status, 400);
  });
});

describe('protected routes need login', () => {
  for (const [method, path] of [
    ['get', '/api/trips'], ['post', '/api/trips'], ['get', '/api/rides/active'],
    ['get', '/api/rewards/me'], ['post', '/api/chat'], ['get', '/api/chat/history'],
  ]) {
    test(`${method.toUpperCase()} ${path} → 401`, async () => {
      const res = await request(app)[method](path).send({});
      assert.equal(res.status, 401);
    });
  }

  test('forged token cookie → treated as logged out', async () => {
    const me = await request(app).get('/api/auth/me').set('Cookie', 't4t_token=abc.def.ghi');
    assert.equal(me.status, 200);
    assert.equal(me.body.user, null);
    const trips = await request(app).get('/api/trips').set('Cookie', 't4t_token=abc.def.ghi');
    assert.equal(trips.status, 401);
  });
});

describe('trip planner maths', () => {
  test('nightsBetween', () => assert.equal(nightsBetween('2026-11-01', '2026-11-05'), 4));

  test('train beats petrol car; flights hidden for short trips', () => {
    const opts = transportOptions(195, 2);
    assert.ok(!opts.find((o) => o.key === 'flight'));
    const train = opts.find((o) => o.key === 'train');
    const petrol = opts.find((o) => o.key === 'petrolCar');
    assert.ok(train.co2PerPersonKg < petrol.co2PerPersonKg);
    // 195 km × 2 (round trip) × 0.035 = 13.65 kg
    assert.equal(train.co2PerPersonKg, 13.7);
    // car shared by 2: 195 × 2 × 0.17 / 2 = 33.15
    assert.equal(petrol.co2PerPersonKg, 33.2);
  });

  test('budget filters stay styles and packages are sorted by eco score', () => {
    const { stays, packages } = buildPackages({ distanceKm: 800, travelers: 3, nights: 4, maxBudgetPerNight: 5000 });
    assert.ok(stays.every((s) => s.estNightlyLow <= 5000));
    assert.ok(!stays.find((s) => s.key === 'certified-eco'));
    for (let i = 1; i < packages.length; i++) assert.ok(packages[i - 1].ecoScore >= packages[i].ecoScore);
    assert.equal(stays[0].rooms, 2); // 3 travellers → 2 rooms
  });

  test('tierInfo', () => {
    assert.equal(tierInfo(0).next.name, 'Bronze Planter');
    assert.equal(tierInfo(120).current.name, 'Bronze Planter');
    assert.equal(tierInfo(120).pointsToNext, 130);
    assert.equal(tierInfo(600).next, null);
  });
});

describe('LLM request format (fake fetch, no real API call)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    config.ai.geminiKey = '';
    config.ai.anthropicKey = '';
    config.ai.provider = 'gemini';
  });

  test('throws 503 when no key configured', async () => {
    await assert.rejects(generateReply({ system: 's', messages: [{ role: 'user', content: 'hi' }] }), (e) => e.statusCode === 503);
  });

  test('Gemini: correct URL, headers, roles and parsing', async () => {
    config.ai.geminiKey = 'test-key';
    let captured;
    globalThis.fetch = async (url, opts) => {
      captured = { url, opts };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Take the train!' }] } }] }), { status: 200 });
    };
    const reply = await generateReply({
      system: 'sys',
      messages: [
        { role: 'assistant', content: 'dangling first msg is dropped' },
        { role: 'user', content: 'Bhopal to Indore?' },
        { role: 'assistant', content: 'Train' },
        { role: 'user', content: 'Why?' },
      ],
    });
    assert.equal(reply, 'Take the train!');
    assert.match(String(captured.url), /models\/gemini-[^:]+:generateContent$/);
    assert.equal(captured.opts.headers['x-goog-api-key'], 'test-key');
    const body = JSON.parse(captured.opts.body);
    assert.equal(body.systemInstruction.parts[0].text, 'sys');
    assert.deepEqual(body.contents.map((c) => c.role), ['user', 'model', 'user']);
  });

  test('Anthropic: correct headers and no sampling params', async () => {
    config.ai.provider = 'anthropic';
    config.ai.anthropicKey = 'sk-test';
    let captured;
    globalThis.fetch = async (url, opts) => {
      captured = { url, opts };
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Hello' }] }), { status: 200 });
    };
    assert.equal(await generateReply({ system: 'sys', messages: [{ role: 'user', content: 'hi' }] }), 'Hello');
    assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(captured.opts.headers['x-api-key'], 'sk-test');
    const body = JSON.parse(captured.opts.body);
    assert.equal(body.system, 'sys');
    assert.ok(!('temperature' in body));
  });

  test('bad key → friendly 502', async () => {
    config.ai.geminiKey = 'wrong';
    globalThis.fetch = async () => new Response('{"error":"API key not valid"}', { status: 400 + 3 });
    await assert.rejects(generateReply({ system: 's', messages: [{ role: 'user', content: 'x' }] }), /rejected the API key/);
  });
});
