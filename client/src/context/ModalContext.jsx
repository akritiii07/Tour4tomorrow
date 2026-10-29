// The pop-up message box from the original page, shared app-wide.
//   const { showModal } = useModal();
//   showModal('Booking Confirmed!', 'You earned 40 points');
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ModalContext = createContext(null);

// Same emoji rules as the original showModal() function.
function decorate(title) {
  const t = title.toLowerCase();
  if (['success', 'confirmed', 'unlocked', 'arrived', 'saved'].some((w) => t.includes(w))) return `✅ ${title}`;
  if (['fail', 'error', 'invalid'].some((w) => t.includes(w))) return `❌ ${title}`;
  if (['required', 'missing'].some((w) => t.includes(w))) return `⚠️ ${title}`;
  if (['cancelled', 'out'].some((w) => t.includes(w))) return `ℹ️ ${title}`;
  return title;
}

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const showModal = useCallback((title, message) => setModal({ title: decorate(title), message }), []);
  const close = () => setModal(null);

  // Close with the Escape key (accessibility)
  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => e.key === 'Escape' && setModal(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      {modal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h3 id="modal-title" className="modal-title">{modal.title}</h3>
            <p className="modal-message">{modal.message}</p>
            <button className="btn btn-green" onClick={close} autoFocus>
              Got it!
            </button>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used inside <ModalProvider>');
  return ctx;
}
