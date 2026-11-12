import { Link } from 'react-router';
import { formatMoney } from '../utils/money.js';
import HotelImage from './HotelImage.jsx';
import Amenities from './Amenities.jsx';
import Availability from './Availability.jsx';
export default function HotelCard({ hotel, search = '' }) {
  return <article className="hotel-card hotel-listing">
    <HotelImage hotelId={hotel.id} city={hotel.location} />
    <div className="hotel-card-content">
      <p className="hotel-location">{hotel.location}</p>
      <h3>{hotel.name}</h3>
      <p className="hotel-description">{hotel.description}</p>
      <Amenities items={hotel.amenities} />
      {hotel.roomTypes.map(room => <div className="room-option" key={room.id}>
        <p>{room.name}</p><p><strong className="price">{formatMoney(room.pricePerNight)}</strong> / night</p>
        <Availability rooms={room.availableRooms} />
        {room.totalAmount != null && <p>{hotel.nights} nights · <strong>{formatMoney(room.totalAmount)}</strong> total</p>}
      </div>)}
      <Link className="button-link card-action" to={`/hotels/${hotel.id}${search ? `?${search}` : ''}`}>View rooms</Link>
    </div>
  </article>;
}
