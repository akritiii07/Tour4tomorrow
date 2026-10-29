import { ChatMessage } from '../models/ChatMessage.js';
import { Trip } from '../models/Trip.js';
import { aiStatus, buildSystemPrompt, generateReply } from '../services/llmService.js';

const HISTORY_LIMIT = 20; // how many past messages the AI sees (keeps cost down)

// GET /api/chat/status  (public) — lets the UI show "not configured" honestly
export function chatStatus(req, res) {
  const { provider, model, configured } = aiStatus();
  res.json({ provider, model, configured });
}

// GET /api/chat/history
export async function getHistory(req, res) {
  const messages = await ChatMessage.find({ user: req.user._id })
    .sort({ createdAt: -1, _id: -1 }) // _id breaks ties between messages saved together
    .limit(50)
    .select('role content createdAt');
  res.json({ messages: messages.reverse() });
}

// POST /api/chat  { message }
export async function sendMessage(req, res) {
  const { message } = req.valid.body;

  const [recent, latestTrip] = await Promise.all([
    ChatMessage.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 }).limit(HISTORY_LIMIT),
    Trip.findOne({ user: req.user._id }).sort({ createdAt: -1 }),
  ]);

  const conversation = recent
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }))
    .concat({ role: 'user', content: message });

  // Call the AI FIRST. If it fails, nothing is saved and the user can retry.
  const reply = await generateReply({
    system: buildSystemPrompt(req.user, latestTrip),
    messages: conversation,
  });

  const { provider } = aiStatus();
  const [userMsg, assistantMsg] = await ChatMessage.create([
    { user: req.user._id, role: 'user', content: message },
    { user: req.user._id, role: 'assistant', content: reply.slice(0, 8000), provider },
  ], { ordered: true });

  res.json({
    userMessage: { _id: userMsg._id, role: 'user', content: userMsg.content, createdAt: userMsg.createdAt },
    reply: { _id: assistantMsg._id, role: 'assistant', content: assistantMsg.content, createdAt: assistantMsg.createdAt },
  });
}

// DELETE /api/chat/history
export async function clearHistory(req, res) {
  await ChatMessage.deleteMany({ user: req.user._id });
  res.json({ message: 'Chat history cleared' });
}
