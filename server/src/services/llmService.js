// Talks to a real Large Language Model API. The API key stays on the server —
// the browser only ever talks to OUR /api/chat route, never to Google/Anthropic
// directly, so nobody can steal the key from the frontend bundle.
//
// Supported providers (choose with AI_PROVIDER in .env):
//   gemini    → Google Gemini API  (generateContent REST endpoint)
//   anthropic → Anthropic Claude   (Messages REST endpoint)
//
// We call the REST endpoints with fetch() instead of installing two SDKs, so you
// can see exactly what is sent over the wire.
import { config } from '../config/env.js';
import { AppError, fetchWithTimeout } from '../utils/AppError.js';
import { transportModes, EMISSION_FACTORS_SOURCE } from '../config/emissionFactors.js';

export function aiStatus() {
  const { provider, geminiKey, anthropicKey, geminiModel, anthropicModel } = config.ai;
  if (provider === 'gemini') return { provider, model: geminiModel, configured: Boolean(geminiKey) };
  if (provider === 'anthropic') return { provider, model: anthropicModel, configured: Boolean(anthropicKey) };
  return { provider, model: null, configured: false };
}

// ── System prompt: tells the model who it is and grounds its numbers ─────────
export function buildSystemPrompt(user, latestTrip) {
  const factorLines = transportModes
    .map((m) =>
      m.perVehicle
        ? `- ${m.name}: ~${m.kgPerVehicleKm} kg CO2e per vehicle-km (shared by everyone in the car)`
        : `- ${m.name}: ~${m.kgPerPassengerKm} kg CO2e per passenger-km`
    )
    .join('\n');

  const tripLine = latestTrip
    ? `The user's most recently saved trip: ${latestTrip.origin.name} → ${latestTrip.destination.name}, ` +
      `${latestTrip.travelers} traveller(s), ${latestTrip.nights} night(s), transport: ${latestTrip.transport?.name}, ` +
      `~${latestTrip.transport?.co2PerPersonKg} kg CO2e per person round trip.`
    : 'The user has not saved a trip yet.';

  return `You are "EcoGuide", the friendly sustainable-travel assistant for Tour4Tomorrow, a student-built web app focused on travel in India and beyond.

Your job:
- Help users plan low-carbon trips (transport choice, where to stay, what to do).
- Explain the environmental impact of travel choices in simple language.
- Suggest practical ways to cut emissions (trains over flights, shared rides, local food, homestays).

Rules:
- When you estimate CO2, use these app factors so your numbers match the Tour4Tomorrow calculator, and show the arithmetic briefly:
${factorLines}
  (${EMISSION_FACTORS_SOURCE})
- Say clearly that figures are estimates.
- Never invent live prices, timetables, hotel availability or bookings. Tour4Tomorrow cannot book tickets or hotels; suggest the user checks official sites (e.g. IRCTC for Indian trains).
- Eco-rides in this app are a simulated demo; say so if asked.
- Keep answers concise (under ~200 words unless asked for detail). Use short bullet lists when helpful.
- If a question is unrelated to travel or sustainability, answer briefly and steer back.

Context: the user's name is ${user.name}. They have ${user.carbonPoints} Carbon Points.
${tripLine}`;
}

// Providers need strictly alternating user/assistant turns starting with 'user'.
function normaliseHistory(messages) {
  const out = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else out.push({ role: m.role, content: m.content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

function providerError(provider, status, body) {
  console.error(`${provider} API error ${status}:`, body.slice(0, 500));
  if (status === 401 || status === 403)
    return new AppError(502, `The ${provider} API rejected the API key. Check it in server/.env.`);
  if (status === 404)
    return new AppError(502, `The ${provider} model was not found. Check the model name in server/.env.`);
  if (status === 429) return new AppError(429, 'The AI service is busy or out of quota. Please try again later.');
  return new AppError(502, `The ${provider} API returned an error (HTTP ${status}).`);
}

async function callGemini(system, messages) {
  const { geminiKey, geminiModel } = config.ai;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user', // Gemini calls the AI "model"
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
    45000
  );
  const raw = await res.text();
  if (!res.ok) throw providerError('Gemini', res.status, raw);
  const data = JSON.parse(raw);
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown';
    throw new AppError(502, `The AI returned no answer (reason: ${reason}). Try rephrasing.`);
  }
  return text;
}

async function callAnthropic(system, messages) {
  const { anthropicKey, anthropicModel } = config.ai;
  const res = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2026-10-21',
      },
      body: JSON.stringify({ model: anthropicModel, max_tokens: 1024, system, messages }),
    },
    45000
  );
  const raw = await res.text();
  if (!res.ok) throw providerError('Anthropic', res.status, raw);
  const data = JSON.parse(raw);
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) throw new AppError(502, 'The AI returned an empty answer. Try rephrasing.');
  return text;
}

/** Send the conversation to the configured provider and return the reply text. */
export async function generateReply({ system, messages }) {
  const status = aiStatus();
  if (!status.configured) {
    throw new AppError(
      503,
      `The AI chatbot isn't configured yet. Add an API key for "${status.provider}" in server/.env (see README).`
    );
  }
  const history = normaliseHistory(messages);
  try {
    if (status.provider === 'gemini') return await callGemini(system, history);
    return await callAnthropic(system, history);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') throw new AppError(504, 'The AI took too long to answer. Please try again.');
    console.error('LLM call failed:', err);
    throw new AppError(502, 'Could not reach the AI service. Check your internet connection.');
  }
}
