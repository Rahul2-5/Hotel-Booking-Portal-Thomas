import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { apiRequest } from '../api.js';
import BookingForm from '../components/BookingForm.jsx';
import HotelImage from '../components/HotelImage.jsx';
import { getTodayDateString } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingNotice, setBookingNotice] = useState('');
  const today = getTodayDateString();
  const fieldErrors = error?.fieldErrors || {};

  useEffect(() => {
    const controller = new AbortController();
    setDates({ checkIn, checkOut });
    setHotel(null);
    setSelectedRoomId(null);
    setError(null);
    setLoading(true);

    async function loadHotel() {
      const query = new URLSearchParams();
      if (checkIn) query.set('checkIn', checkIn);
      if (checkOut) query.set('checkOut', checkOut);
      const queryString = query.toString();
      try {
        const data = await apiRequest(`/hotels/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setHotel(data);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadHotel();
    return () => controller.abort();
  }, [id, checkIn, checkOut, refreshKey]);

  function handleDateChange(event) {
    const { name, value } = event.target;
    setDates((current) => ({ ...current, [name]: value }));
  }

  function updateDates(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (dates.checkIn) query.set('checkIn', dates.checkIn);
    if (dates.checkOut) query.set('checkOut', dates.checkOut);
    setBookingNotice('');
    if (dates.checkIn === checkIn && dates.checkOut === checkOut) {
      setRefreshKey((current) => current + 1);
    } else {
      setParams(query);
    }
  }

  function handleSoldOut() {
    setBookingNotice('That room sold out. Please choose another room or different dates.');
    setRefreshKey((current) => current + 1);
  }

  const selectedRoom = hotel?.roomTypes.find((room) => room.id === selectedRoomId);

  return (
    <>
      <Link className="back-link" to="/">Back to hotel search</Link>
      {hotel && <p className="eyebrow">{hotel.location} · Your next stay</p>}
      <h1>{hotel ? hotel.name : 'Hotel details'}</h1>
      {hotel && <HotelImage key={hotel.id} hotelId={hotel.id} className="detail-image" eager />}

      <form className="search-form details-search" aria-label="Check room availability" onSubmit={updateDates}>
        <div className="form-field">
          <label htmlFor="details-checkIn">Check-in</label>
          <input id="details-checkIn" name="checkIn" type="date" min={today}
            value={dates.checkIn} onChange={handleDateChange}
            aria-invalid={Boolean(fieldErrors.checkIn)}
            aria-describedby={fieldErrors.checkIn ? 'details-checkIn-error' : undefined} />
          {fieldErrors.checkIn && <span className="field-error" id="details-checkIn-error">{fieldErrors.checkIn}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="details-checkOut">Check-out</label>
          <input id="details-checkOut" name="checkOut" type="date" min={dates.checkIn || today}
            value={dates.checkOut} onChange={handleDateChange}
            aria-invalid={Boolean(fieldErrors.checkOut)}
            aria-describedby={fieldErrors.checkOut ? 'details-checkOut-error' : undefined} />
          {fieldErrors.checkOut && <span className="field-error" id="details-checkOut-error">{fieldErrors.checkOut}</span>}
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading}>Check availability</button>
        </div>
      </form>

      {loading && <p role="status">Loading hotel details…</p>}
      {error && <p className="error-message" role="alert">{error.message}</p>}
      {bookingNotice && <p className="error-message" role="alert">{bookingNotice}</p>}

      {hotel && !loading && (
        <>
          <div className="hotel-overview">
          <h2>A little about your stay</h2>
          {hotel.description && <p>{hotel.description}</p>}
          <ul className="amenities" aria-label="Amenities">
            {hotel.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}
          </ul>
          </div>
          {hotel.nights === null && <p>Choose both dates above to see availability and book a room.</p>}

          <section className="rooms-section" aria-labelledby="rooms-heading">
            <p className="eyebrow">Make yourself at home</p>
            <h2 id="rooms-heading">Choose your room</h2>
            {hotel.roomTypes.map((room) => (
              <article className="hotel-card" key={room.id}>
                <h3>{room.name}</h3>
                <p>{formatMoney(room.pricePerNight)} per night</p>
                {room.availableRooms === 0 && <p className="error-message">Sold out for the selected dates.</p>}
                {room.availableRooms > 0 && (
                  <>
                    <p>{room.availableRooms} room{room.availableRooms === 1 ? '' : 's'} available.</p>
                    <p>Total for {hotel.nights} night{hotel.nights === 1 ? '' : 's'}: <strong>{formatMoney(room.totalAmount)}</strong></p>
                    <button type="button" onClick={() => { setSelectedRoomId(room.id); setBookingNotice(''); }}>
                      Book this room
                    </button>
                  </>
                )}
              </article>
            ))}
            {hotel.roomTypes.length === 0 && <p>No room options are listed for this hotel.</p>}
          </section>

          {selectedRoom && (
            <BookingForm key={`${selectedRoom.id}-${hotel.checkIn}-${hotel.checkOut}`}
              hotel={hotel} room={selectedRoom} onSoldOut={handleSoldOut} />
          )}
        </>
      )}
    </>
  );
}
