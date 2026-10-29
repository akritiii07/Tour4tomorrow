import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import './chat.css';

const SUGGESTIONS = [
  'Train or car from Bhopal to Indore for 2 people — which is greener?',
  'Plan a 3-day low-carbon weekend in Jaipur',
  'How can I reduce the footprint of a flight I must take?',
];

// Renders the AI's reply safely: **bold** and "- " bullet lines, no raw HTML.
// (Never use dangerouslySetInnerHTML with AI output — it could contain scripts.)
function FormattedText({ text }) {
  const inline = (line, key) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : part
    );
  const blocks = [];
  let list = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if (bullet) {
      list.push(<li key={i}>{inline(bullet[1], i)}</li>);
      return;
    }
    if (list.length) {
      blocks.push(<ul key={`ul-${i}`}>{list}</ul>);
      list = [];
    }
    if (line.trim()) blocks.push(<p key={i}>{inline(line.replace(/^#+\s*/, ''), i)}</p>);
  });
  if (list.length) blocks.push(<ul key="ul-end">{list}</ul>);
  return <>{blocks}</>;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null); // { configured, provider, model }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    api('/chat/status').then(setStatus).catch((e) => setError(e.message));
    if (user) api('/chat/history').then((d) => setMessages(d.messages)).catch(() => {});
    else setMessages([]);
  }, [open, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setError('');
    const temp = { _id: `temp-${Date.now()}`, role: 'user', content: message };
    setMessages((m) => [...m, temp]); // show it immediately ("optimistic update")
    setSending(true);
    try {
      const { userMessage, reply } = await api('/chat', { method: 'POST', body: { message } });
      setMessages((m) => [...m.filter((x) => x._id !== temp._id), userMessage, reply]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x._id !== temp._id));
      setInput(message); // give the text back so the user can retry
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function clear() {
    if (!window.confirm('Delete your whole chat history?')) return;
    await api('/chat/history', { method: 'DELETE' }).catch(() => {});
    setMessages([]);
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close EcoGuide chat' : 'Open EcoGuide chat'}>
        <i className={`fas ${open ? 'fa-times' : 'fa-comment-dots'}`} />
        {!open && <span className="chat-fab-label">Ask EcoGuide</span>}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="EcoGuide AI travel assistant">
          <div className="chat-header">
            <div>
              <p className="bold">🌿 EcoGuide</p>
              <p className="xs" style={{ opacity: 0.85 }}>
                AI sustainable-travel assistant{status?.configured ? ` · ${status.provider}` : ''}
              </p>
            </div>
            {user && messages.length > 0 && (
              <button className="chat-clear" onClick={clear} title="Clear history"><i className="fas fa-trash" /></button>
            )}
          </div>

          <div className="chat-body">
            {!user ? (
              <div className="chat-empty">
                <p>👋 Hi! I can help you plan low-carbon trips and explain your travel footprint.</p>
                <p className="small muted">Please log in so your conversation can be saved.</p>
                <Link to="/login" className="btn btn-green" onClick={() => setOpen(false)}>Log in to chat</Link>
              </div>
            ) : status && !status.configured ? (
              <div className="chat-empty">
                <p>🔧 The AI chatbot isn&apos;t configured on this server yet.</p>
                <p className="small muted">
                  Add a <code>{status.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'}</code> to <code>server/.env</code> and restart the backend.
                </p>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="chat-empty">
                    <p>👋 Hi {user.name.split(' ')[0]}! Ask me anything about sustainable travel.</p>
                    <div className="chat-suggestions">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => send(s)} disabled={sending}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m._id} className={`msg ${m.role}`}>
                    {m.role === 'assistant' ? <FormattedText text={m.content} /> : m.content}
                  </div>
                ))}
                {sending && <div className="msg assistant typing"><span /><span /><span /></div>}
              </>
            )}
            {error && <p className="chat-error">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {user && status?.configured && (
            <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input
                className="input"
                placeholder="Ask about green travel…"
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Message"
              />
              <button className="btn btn-green" type="submit" disabled={sending || !input.trim()} aria-label="Send">
                <i className="fas fa-paper-plane" />
              </button>
            </form>
          )}
          <p className="chat-disclaimer">AI answers can be wrong. Emission figures are estimates.</p>
        </div>
      )}
    </>
  );
}
