import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { apiRequest } from '../api.js';
import BookingSteps from '../components/BookingSteps.jsx';
import Amenities from '../components/Amenities.jsx';
import Availability from '../components/Availability.jsx';
import BookingForm from '../components/BookingForm.jsx';
import HotelImage from '../components/HotelImage.jsx';
import { getTodayDateString, nextDate } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';
import { scrollToSection } from '../utils/scrollToSection.js';
import Snackbar from '../components/Snackbar.jsx';

export default function HotelDetailsPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const checkIn = params.get('checkIn') || '';
  const checkOut = params.get('checkOut') || '';
  const [dates, setDates] = useState({ checkIn, checkOut });
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [bookingScrollRequest, setBookingScrollRequest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingNotice, setBookingNotice] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const roomsHeading = useRef(null);
  const scrollAfterAvailability = useRef(false);
  const notify = useCallback(message => {
    setSnackbar(current => ({ id: (current?.id || 0) + 1, message }));
  }, []);
  const dismissSnackbar = useCallback(() => setSnackbar(null), []);
  const today = getTodayDateString();
  const fieldErrors = error?.fieldErrors || {};

  useEffect(() => {
    const controller = new AbortController();
    setDates({ checkIn, checkOut });
    setHotel(null); setSelectedRoomId(null); setError(null); setLoading(true);
    const query = new URLSearchParams();
    if (checkIn) query.set('checkIn', checkIn);
    if (checkOut) query.set('checkOut', checkOut);
    apiRequest(`/hotels/${encodeURIComponent(id)}?${query}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setHotel(data); })
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, checkIn, checkOut, refreshKey]);

  useEffect(() => {
    if (loading || !scrollAfterAvailability.current) return;
    scrollAfterAvailability.current = false;
    if (error) {
      notify('Availability could not be checked. Please review the message beside your dates.');
    } else if (hotel) {
      scrollToSection(roomsHeading.current);
      notify(hotel.roomTypes.some(room => room.availableRooms > 0)
        ? 'Availability checked. Choose a room below, then select Book this room.'
        : 'No rooms are available for these dates. Try a different check-in or check-out.');
    }
  }, [loading, hotel, error, notify]);

  function handleDateChange(event) {
    const { name, value } = event.target;
    setDates(current => ({ ...current, [name]: value }));
    setSelectedRoomId(null);
    dismissSnackbar();
  }
  function updateDates(event) {
    event.preventDefault();
    scrollAfterAvailability.current = true;
    dismissSnackbar();
    const query = new URLSearchParams(params);
    for (const [key, value] of Object.entries(dates)) {
      if (value) query.set(key, value); else query.delete(key);
    }
    setBookingNotice('');
    if (dates.checkIn === checkIn && dates.checkOut === checkOut) setRefreshKey(current => current + 1);
    else setParams(query);
  }
  function handleSoldOut() {
    setBookingNotice('That room sold out. Please choose another room or different dates.');
    setRefreshKey(current => current + 1);
    notify('This room just sold out. Please choose another room or change your dates.');
  }
  const selectedRoom = hotel?.roomTypes.find(room => room.id === selectedRoomId);
  const datesMatchQuote = dates.checkIn === checkIn && dates.checkOut === checkOut;

  return (
    <>
      <Link className="back-link" to={`/?${params}`}>Back to hotel search</Link>
      {hotel && <p className="eyebrow">{hotel.location} · Your next stay</p>}
      {!selectedRoom && <BookingSteps current={0} />}
      <h1>{hotel ? hotel.name : 'Hotel details'}</h1>
      {hotel && <HotelImage hotelId={hotel.id} city={hotel.location} className="detail-image" />}
      <div className="details-layout">
        <div className="details-main">
          {hotel && <section className="hotel-overview" aria-labelledby="about-heading">
            <h2 id="about-heading">About your stay</h2>
            <p>{hotel.description}</p>
            <h3>Amenities</h3>
            <Amenities items={hotel.amenities} />
          </section>}
        </div>
        <aside className="booking-sidebar" aria-label="Booking summary">
          <h2>Your stay</h2>
          <form className="search-form details-search" aria-label="Check room availability" onSubmit={updateDates}>
            {['checkIn', 'checkOut'].map(field => <div className="form-field" key={field}>
              <label htmlFor={`details-${field}`}>{field === 'checkIn' ? 'Check-in' : 'Check-out'}</label>
              <input id={`details-${field}`} name={field} type="date" required
                min={field === 'checkIn' ? today : nextDate(dates.checkIn)}
                value={dates[field]} onChange={handleDateChange}
                aria-invalid={Boolean(fieldErrors[field])}
                aria-describedby={fieldErrors[field] ? `details-${field}-error` : undefined} />
              {fieldErrors[field] && <span className="field-error" id={`details-${field}-error`}>{fieldErrors[field]}</span>}
            </div>)}
            <div className="form-actions"><button type="submit" disabled={loading}>Check availability</button></div>
          </form>
          {loading && <p role="status">Loading hotel details…</p>}
          {error && <p className="error-message" role="alert">{error.message}</p>}
          {bookingNotice && <p className="error-message" role="alert">{bookingNotice}</p>}
          {hotel && !loading && <section className="rooms-section" aria-labelledby="rooms-heading">
            <h3 id="rooms-heading" ref={roomsHeading} tabIndex={-1}>Choose your room</h3>
            {!datesMatchQuote && <p role="status">Check availability to update the quote for your new dates.</p>}
            {hotel.roomTypes.map(room => <article className="hotel-card" key={room.id}>
              <h3>{room.name}</h3>
              <dl className="booking-summary">
                <dt>Price per night</dt><dd>{formatMoney(room.pricePerNight)}</dd>
                {hotel.nights != null && <>
                  <dt>Nights</dt><dd>{hotel.nights}</dd>
                  <dt>Check-in</dt><dd>{hotel.checkIn}</dd>
                  <dt>Check-out</dt><dd>{hotel.checkOut}</dd>
                  <dt>Stay total</dt><dd><strong>{formatMoney(room.totalAmount)}</strong></dd>
                </>}
              </dl>
              <Availability rooms={room.availableRooms} />
              {room.availableRooms > 0 && <button type="button" disabled={!datesMatchQuote}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setBookingScrollRequest(current => current + 1);
                  setBookingNotice('');
                }}>Book this room</button>}
            </article>)}
            {hotel.roomTypes.length === 0 && <p>No room options are listed for this hotel.</p>}
          </section>}
        </aside>
      </div>
      {selectedRoom && <BookingForm key={`${selectedRoom.id}-${hotel.checkIn}-${hotel.checkOut}`}
        hotel={hotel} room={selectedRoom} onSoldOut={handleSoldOut} onGuide={notify} scrollRequest={bookingScrollRequest} />}
      <Snackbar notice={snackbar} onDismiss={dismissSnackbar} />
    </>
  );
}
