import { useRef, useState } from 'react';
import { apiRequest } from '../api.js';
import { getTodayDateString, nextDate } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';

export default function DateChangeForm({ booking, onUpdated, onBusyChange, onClose }) {
  const [dates, setDates] = useState({ checkIn: booking.checkIn, checkOut: booking.checkOut });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const fieldErrors = error?.fieldErrors || {};
  const today = getTodayDateString();

  function handleChange(event) {
    const { name, value } = event.target;
    setDates((current) => ({ ...current, [name]: value }));
    setPreview(null);
    setError(null);
  }

  async function sendChange(confirm) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    const request = { email: booking.guestEmail, ...dates };
    const path = `/bookings/${encodeURIComponent(booking.bookingReference)}`;
    try {
      if (confirm) {
        const updated = await apiRequest(`${path}/dates`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        onUpdated(updated);
      } else {
        const query = new URLSearchParams(request);
        setPreview(await apiRequest(`${path}/date-change-preview?${query}`));
      }
    } catch (requestError) {
      setPreview(null);
      setError(requestError);
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="booking-panel" aria-labelledby="change-dates-heading">
      <h3 id="change-dates-heading">Change booking dates</h3>
      {booking.dateChangeCount === 0 && <p>Your first date change is free.</p>}
      <form className="booking-form" onSubmit={(event) => { event.preventDefault(); sendChange(false); }}>
        <div className="form-field">
          <label htmlFor="change-checkIn">New check-in</label>
          <input id="change-checkIn" name="checkIn" type="date" required min={today}
            value={dates.checkIn} onChange={handleChange} disabled={busy}
            aria-invalid={Boolean(fieldErrors.checkIn)}
            aria-describedby={fieldErrors.checkIn ? 'change-checkIn-error' : undefined} />
          {fieldErrors.checkIn && <span className="field-error" id="change-checkIn-error">{fieldErrors.checkIn}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="change-checkOut">New check-out</label>
          <input id="change-checkOut" name="checkOut" type="date" required min={nextDate(dates.checkIn)}
            value={dates.checkOut} onChange={handleChange} disabled={busy}
            aria-invalid={Boolean(fieldErrors.checkOut)}
            aria-describedby={fieldErrors.checkOut ? 'change-checkOut-error' : undefined} />
          {fieldErrors.checkOut && <span className="field-error" id="change-checkOut-error">{fieldErrors.checkOut}</span>}
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Preview date change'}</button>
      </form>
      {error && <p className="error-message" role="alert">{error.message}</p>}
      {preview && (
        <>
          <dl className="booking-summary">
            <dt>Nights</dt><dd>{preview.nights}</dd>
            <dt>Current total</dt><dd>{formatMoney(preview.oldTotal)}</dd>
            <dt>New total</dt><dd id="date-change-total">{formatMoney(preview.newTotal)}</dd>
            <dt>Stay price difference</dt><dd>{formatMoney(preview.difference)}</dd>
            <dt>Change fee</dt><dd id="date-change-fee">{preview.changeFee === 0 ? 'Free change' : formatMoney(preview.changeFee)}</dd>
          </dl>
          <p id="date-change-difference">
            {preview.netChange > 0
              ? `You pay ${formatMoney(preview.netChange)} more.`
              : preview.netChange < 0
                ? `You pay ${formatMoney(Math.abs(preview.netChange))} less.`
                : 'Your total stays the same.'}
          </p>
          {preview.available ? (
            <button type="button" disabled={busy} onClick={() => sendChange(true)}>
              {busy ? 'Updating…' : 'Confirm date change'}
            </button>
          ) : (
            <p className="error-message" role="alert">The new dates are sold out. Your booking is unchanged.</p>
          )}
        </>
      )}
      <p className="booking-actions"><button className="button-secondary" type="button" disabled={busy} onClick={onClose}>Close date change</button></p>
    </section>
  );
}
