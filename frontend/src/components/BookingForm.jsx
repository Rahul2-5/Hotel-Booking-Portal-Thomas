import BookingSteps from './BookingSteps.jsx';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, apiRequest } from '../api.js';
import { formatMoney } from '../utils/money.js';
import { scrollToSection } from '../utils/scrollToSection.js';

export default function BookingForm({ hotel, room, onSoldOut, onGuide, scrollRequest }) {
  const navigate = useNavigate();
  const [guest, setGuest] = useState({ guestName: '', guestEmail: '' });
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submitting = useRef(false);
  const fieldErrors = error?.fieldErrors || {};
  const heading = useRef(null);

  useEffect(() => {
    scrollToSection(heading.current);
    onGuide(review
      ? 'Review your stay and total below. Confirm booking when you are ready.'
      : 'Enter your name and email below, then select Review booking. Your room is booked only after confirmation.');
  }, [review, onGuide, scrollRequest]);

  function handleChange(event) {
    const { name, value } = event.target;
    setGuest((current) => ({ ...current, [name]: value }));
  }

  async function reviewBooking(event) {
    event.preventDefault();
    const trimmedGuest = {
      guestName: guest.guestName.trim(),
      guestEmail: guest.guestEmail.trim(),
    };
    if (!trimmedGuest.guestName) {
      setError(new ApiError(400, 'VALIDATION_ERROR', 'Please enter your name.', {
        guestName: 'Guest name is required.',
      }));
      return;
    }
    setGuest(trimmedGuest);
    setError(null);
    setBusy(true);
    try {
      // Refresh the backend quote before review. No booking is created by this GET request.
      const query = new URLSearchParams({ checkIn: hotel.checkIn, checkOut: hotel.checkOut });
      const freshHotel = await apiRequest(`/hotels/${hotel.id}?${query}`);
      const freshRoom = freshHotel.roomTypes.find((option) => option.id === room.id);
      if (!freshRoom) throw new ApiError(404, 'NOT_FOUND', 'This room is no longer listed for booking.');
      if (freshRoom.availableRooms === 0) {
        onSoldOut();
        return;
      }
      setReview({ hotel: freshHotel, room: freshRoom });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmBooking() {
    // This immediate flag also blocks a second click before React disables the button.
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const booking = await apiRequest('/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId: review.room.id,
          guestName: guest.guestName,
          guestEmail: guest.guestEmail,
          checkIn: review.hotel.checkIn,
          checkOut: review.hotel.checkOut,
        }),
      });
      navigate('/bookings/confirmation', { state: { booking }, replace: true });
    } catch (requestError) {
      if (requestError.status === 409 && requestError.code === 'SOLD_OUT') {
        onSoldOut();
      } else {
        setReview(null);
        setError(requestError);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="booking-panel" aria-labelledby="booking-heading">
      <BookingSteps current={review ? 2 : 1} />
      <h2 id="booking-heading" ref={heading} tabIndex={-1}>{review ? 'Review your booking' : 'Guest details'}</h2>
      {error && <p className="error-message" role="alert">{error.message}</p>}

      {review ? (
        <>
          <dl className="booking-summary">
            <dt>Hotel</dt><dd>{review.hotel.name}</dd>
            <dt>Room</dt><dd>{review.room.name}</dd>
            <dt>Guest</dt><dd>{guest.guestName}</dd>
            <dt>Email</dt><dd>{guest.guestEmail}</dd>
            <dt>Check-in</dt><dd>{review.hotel.checkIn}</dd>
            <dt>Check-out</dt><dd>{review.hotel.checkOut}</dd>
            <dt>Nights</dt><dd>{review.hotel.nights}</dd>
            <dt>Price per night</dt><dd>{formatMoney(review.room.pricePerNight)}</dd>
            <dt>Total amount</dt><dd><strong id="review-total">{formatMoney(review.room.totalAmount)}</strong></dd>
          </dl>
          <p>Confirm below to create your booking.</p>
          <div className="booking-actions">
            <button className="button-secondary" type="button" disabled={busy} onClick={() => setReview(null)}>Edit guest details</button>
            <button type="button" disabled={busy} onClick={confirmBooking}>
              {busy ? 'Confirming…' : 'Confirm booking'}
            </button>
          </div>
        </>
      ) : (
        <form className="booking-form" onSubmit={reviewBooking}>
          <p>{room.name}: {hotel.checkIn} to {hotel.checkOut}</p>
          <div className="form-field">
            <label htmlFor="guestName">Name</label>
            <input id="guestName" name="guestName" autoComplete="name" required maxLength={100}
              value={guest.guestName} onChange={handleChange} disabled={busy}
              aria-invalid={Boolean(fieldErrors.guestName)}
              aria-describedby={fieldErrors.guestName ? 'guestName-error' : undefined} />
            {fieldErrors.guestName && <span className="field-error" id="guestName-error">{fieldErrors.guestName}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="guestEmail">Email</label>
            <input id="guestEmail" name="guestEmail" type="email" autoComplete="email" required maxLength={150}
              value={guest.guestEmail} onChange={handleChange} disabled={busy}
              aria-invalid={Boolean(fieldErrors.guestEmail)}
              aria-describedby={fieldErrors.guestEmail ? 'guestEmail-error' : undefined} />
            {fieldErrors.guestEmail && <span className="field-error" id="guestEmail-error">{fieldErrors.guestEmail}</span>}
          </div>
          {['roomTypeId', 'checkIn', 'checkOut'].map((field) => fieldErrors[field] && (
            <p className="field-error" key={field}>{field}: {fieldErrors[field]}</p>
          ))}
          <button type="submit" disabled={busy}>{busy ? 'Checking availability…' : 'Review booking'}</button>
        </form>
      )}
    </section>
  );
}
