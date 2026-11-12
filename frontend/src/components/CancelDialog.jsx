import { useEffect, useRef } from 'react';
export default function CancelDialog({ reference, busy, returnFocus, onClose, onConfirm, error }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => {
      element.close();
      returnFocus.current?.focus();
    };
  }, [returnFocus]);
  return <dialog ref={dialog} aria-labelledby="cancel-heading" aria-describedby="cancel-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="cancel-heading">Cancel this booking?</h2>
    <p id="cancel-description">Booking {reference} will be cancelled and its room released. This cannot be undone.</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="booking-actions"><button className="button-secondary" autoFocus disabled={busy} onClick={onClose}>Keep booking</button><button className="button-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
  </dialog>;
}
