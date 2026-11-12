import { useEffect, useState } from 'react';

export default function Snackbar({ notice, onDismiss }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!notice || paused) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [notice, paused, onDismiss]);

  return (
    <div className="snackbar-region" role="status" aria-live="polite" aria-atomic="true">
      {notice && <div className="snackbar"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
        <p>{notice.message}</p>
        <button type="button" className="button-secondary" onClick={() => { setPaused(false); onDismiss(); }} aria-label="Dismiss instruction">Dismiss</button>
      </div>}
    </div>
  );
}
