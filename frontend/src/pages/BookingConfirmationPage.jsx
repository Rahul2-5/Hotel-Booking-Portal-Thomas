import { useState } from 'react';
import BookingSteps from '../components/BookingSteps.jsx';
import { Link, useLocation } from 'react-router';
import { formatMoney } from '../utils/money.js';

export default function BookingConfirmationPage() {
  const { state } = useLocation();
  const booking = state?.booking;
  const [copyMessage, setCopyMessage] = useState('');
  async function copyReference() {
    try { await navigator.clipboard.writeText(booking.bookingReference); setCopyMessage('Reference copied.'); }
    catch { setCopyMessage('Copy was unavailable. Select the reference and copy it manually.'); }
  }

  if (!booking) {
    return (
      <section>
        <h1>No booking confirmation to display</h1>
        <p>Your reference will appear here after a booking is successfully confirmed.</p>
        <Link to="/">Back to hotel search</Link>
      </section>
    );
  }

  return (
    <section className="booking-panel confirmation-panel">
      <BookingSteps current={3} /><p className="eyebrow">Your stay is reserved</p>
      <h1>Booking confirmed</h1>
      <p>Your booking reference: <strong id="booking-reference">{booking.bookingReference}</strong></p>
      <button type="button" className="button-secondary" onClick={copyReference}>Copy reference</button><p role="status">{copyMessage}</p>
      <p>Keep this reference and the email address used for your booking.</p>
      <dl className="booking-summary">
        <dt>Hotel</dt><dd>{booking.hotelName}</dd>
        <dt>Room</dt><dd>{booking.roomTypeName}</dd>
        <dt>Guest</dt><dd>{booking.guestName}</dd>
        <dt>Email</dt><dd>{booking.guestEmail}</dd>
        <dt>Check-in</dt><dd>{booking.checkIn}</dd>
        <dt>Check-out</dt><dd>{booking.checkOut}</dd>
        <dt>Nights</dt><dd>{booking.nights}</dd>
        <dt>Price per night</dt><dd>{formatMoney(booking.pricePerNight)}</dd>
        <dt>Total amount</dt><dd><strong>{formatMoney(booking.totalAmount)}</strong></dd>
        <dt>Change fees</dt><dd>{formatMoney(booking.changeFeeTotal)}</dd>
        <dt>Amount due</dt><dd><strong>{formatMoney(booking.amountDue)}</strong></dd>
        <dt>Status</dt><dd><span className="status-badge">{booking.status}</span></dd>
      </dl>
      <div className="booking-actions">
        <Link className="button-link" to="/manage-booking" state={{ reference: booking.bookingReference, email: booking.guestEmail }}>
          Manage this booking
        </Link>
        <Link className="button-link button-secondary" to="/">Back to hotel search</Link>
      </div>
    </section>
  );
}
