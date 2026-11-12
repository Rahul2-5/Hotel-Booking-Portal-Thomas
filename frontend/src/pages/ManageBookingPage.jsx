import { useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { ApiError, apiRequest } from '../api.js';
import { formatMoney } from '../utils/money.js';
import DateChangeForm from '../components/DateChangeForm.jsx';

export default function ManageBookingPage() {
  const { state } = useLocation();
  const [lookup, setLookup] = useState({
    reference: state?.reference || '',
    email: state?.email || '',
  });
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [operation, setOperation] = useState(null);
  const requestInFlight = useRef(false);
  const [dateChangeOpen, setDateChangeOpen] = useState(false);
  const [dateChangeBusy, setDateChangeBusy] = useState(false);
  const busy = operation !== null || dateChangeBusy;
  const fieldErrors = error?.fieldErrors || {};

  function handleChange(event) {
    const { name, value } = event.target;
    setLookup((current) => ({ ...current, [name]: value }));
    // Edited credentials must be looked up again before showing a cancellable booking.
    setBooking(null);
    setDateChangeOpen(false);
    setError(null);
    setMessage('');
  }

  async function findBooking(event) {
    event.preventDefault();
    if (requestInFlight.current) return;
    const reference = lookup.reference.trim().toUpperCase();
    const email = lookup.email.trim();
    setError(null);
    setMessage('');
    setBooking(null);
    setDateChangeOpen(false);
    if (!reference) {
      setError(new ApiError(400, 'VALIDATION_ERROR', 'Please enter your booking reference.', {
        reference: 'Booking reference is required.',
      }));
      return;
    }

    requestInFlight.current = true;
    setOperation('lookup');
    setLookup({ reference, email });
    try {
      const query = new URLSearchParams({ email });
      const found = await apiRequest(`/bookings/${encodeURIComponent(reference)}?${query}`);
      setBooking(found);
    } catch (requestError) {
      setError(requestError);
    } finally {
      requestInFlight.current = false;
      setOperation(null);
    }
  }

  async function cancelBooking() {
    if (requestInFlight.current || !booking || booking.status === 'CANCELLED') return;
    if (!window.confirm(`Cancel booking ${booking.bookingReference}? This will release the room.`)) return;

    requestInFlight.current = true;
    setOperation('cancel');
    setError(null);
    setMessage('');
    try {
      const cancelled = await apiRequest(`/bookings/${encodeURIComponent(booking.bookingReference)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: booking.guestEmail }),
      });
      setBooking(cancelled);
      setMessage('Booking cancelled successfully.');
    } catch (requestError) {
      setError(requestError);
      if (requestError.status === 409 && requestError.code === 'ALREADY_CANCELLED') {
        // Another request may have cancelled it since lookup. Display the latest stored status.
        try {
          const query = new URLSearchParams({ email: booking.guestEmail });
          const latest = await apiRequest(`/bookings/${encodeURIComponent(booking.bookingReference)}?${query}`);
          setBooking(latest);
        } catch (refreshError) {
          setBooking(null);
          setError(refreshError);
        }
      } else if (requestError.status === 404) {
        setBooking(null);
      }
    } finally {
      requestInFlight.current = false;
      setOperation(null);
    }
  }

  return (
    <>
      <p className="eyebrow">Your stay, your plans</p>
      <h1>Manage booking</h1>
      <p>Find your booking using its reference and the email address you booked with.</p>
      <form className="booking-form" onSubmit={findBooking}>
        <div className="form-field">
          <label htmlFor="reference">Booking reference</label>
          <input id="reference" name="reference" required maxLength={20}
            value={lookup.reference} onChange={handleChange} disabled={busy}
            aria-invalid={Boolean(fieldErrors.reference)}
            aria-describedby={fieldErrors.reference ? 'reference-error' : undefined} />
          {fieldErrors.reference && <span className="field-error" id="reference-error">{fieldErrors.reference}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="email">Email used for booking</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={150}
            value={lookup.email} onChange={handleChange} disabled={busy}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
          {fieldErrors.email && <span className="field-error" id="email-error">{fieldErrors.email}</span>}
        </div>
        <button type="submit" disabled={busy}>{operation === 'lookup' ? 'Finding booking…' : 'Find booking'}</button>
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error.status === 404 ? 'No booking matches that reference and email.' : error.message}
        </p>
      )}
      {message && <p className="success-message" role="status">{message}</p>}

      {booking && (
        <section className="booking-panel" aria-labelledby="managed-booking-heading">
          <h2 id="managed-booking-heading">Booking details</h2>
          <dl className="booking-summary">
            <dt>Reference</dt><dd>{booking.bookingReference}</dd>
            <dt>Hotel</dt><dd>{booking.hotelName}</dd>
            <dt>Room</dt><dd>{booking.roomTypeName}</dd>
            <dt>Guest</dt><dd>{booking.guestName}</dd>
            <dt>Email</dt><dd>{booking.guestEmail}</dd>
            <dt>Check-in</dt><dd>{booking.checkIn}</dd>
            <dt>Check-out</dt><dd>{booking.checkOut}</dd>
            <dt>Nights</dt><dd>{booking.nights}</dd>
            <dt>Price per night</dt><dd>{formatMoney(booking.pricePerNight)}</dd>
            <dt>Total amount</dt><dd><strong>{formatMoney(booking.totalAmount)}</strong></dd>
            <dt>Change fees charged</dt><dd id="change-fee-total">{formatMoney(booking.changeFeeTotal)}</dd>
            <dt>Amount due</dt><dd id="amount-due"><strong>{formatMoney(booking.amountDue)}</strong></dd>
            <dt>Status</dt><dd id="managed-booking-status"><span className={`status-badge ${booking.status === 'CANCELLED' ? 'status-cancelled' : ''}`}>{booking.status}</span></dd>
            {booking.cancelledAt && <><dt>Cancelled at</dt><dd>{booking.cancelledAt.replace('T', ' ')}</dd></>}
          </dl>
          {booking.status === 'CANCELLED' ? (
            <p>This booking is already cancelled.</p>
          ) : (
            <>
              <div className="booking-actions">
                <button type="button" disabled={busy} aria-expanded={dateChangeOpen} onClick={() => setDateChangeOpen(true)}>Change dates</button>
                <button className="button-danger" type="button" disabled={busy} onClick={cancelBooking}>
                  {operation === 'cancel' ? 'Cancelling…' : 'Cancel booking'}
                </button>
              </div>
              {dateChangeOpen && (
                <DateChangeForm key={`${booking.bookingReference}-${booking.checkIn}-${booking.checkOut}`}
                  booking={booking} onBusyChange={setDateChangeBusy} onClose={() => setDateChangeOpen(false)}
                  onUpdated={(updated) => {
                    setBooking(updated);
                    setDateChangeOpen(false);
                    setError(null);
                    setMessage('Booking dates updated successfully.');
                  }} />
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
