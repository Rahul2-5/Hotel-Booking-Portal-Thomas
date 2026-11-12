import { Link } from 'react-router';
import { formatMoney } from '../utils/money.js';
import HotelImage from './HotelImage.jsx';

export default function HotelCard({ hotel }) {
  const params = new URLSearchParams();
  if (hotel.checkIn && hotel.checkOut) {
    params.set('checkIn', hotel.checkIn);
    params.set('checkOut', hotel.checkOut);
  }
  const query = params.toString();

  return (
    <article className="hotel-card hotel-listing" aria-labelledby={`hotel-${hotel.id}`}>
      <HotelImage hotelId={hotel.id} />
      <div className="hotel-card-content">
      <p className="hotel-location">{hotel.location}</p>
      <h3 id={`hotel-${hotel.id}`}>{hotel.name}</h3>
      {hotel.description && <p className="hotel-description">{hotel.description}</p>}

      {hotel.amenities.length > 0 && (
        <ul className="amenities" aria-label="Amenities">
          {hotel.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}
        </ul>
      )}

      {hotel.roomTypes.map((room) => (
        <div className="room-option" key={room.id}>
          <p className="room-price"><strong>{room.name}</strong><span><b>{formatMoney(room.pricePerNight)}</b> <small>/ night</small></span></p>
          {room.availableRooms !== null && (
            <p className={room.availableRooms === 0 ? 'availability-sold-out' : 'availability-note'}>
              {room.availableRooms === 0
                ? 'Sold out for the selected dates.'
                : `${room.availableRooms} room${room.availableRooms === 1 ? '' : 's'} available.`}
            </p>
          )}
          {room.totalAmount !== null && (
            <p>
              Total for {hotel.nights} night{hotel.nights === 1 ? '' : 's'}:
              {' '}<strong>{formatMoney(room.totalAmount)}</strong>
            </p>
          )}
        </div>
      ))}
      {hotel.roomTypes.length === 0 && <p>No room options are listed for this hotel.</p>}
      <Link className="button-link card-action" to={`/hotels/${hotel.id}${query ? `?${query}` : ''}`}>View details <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
