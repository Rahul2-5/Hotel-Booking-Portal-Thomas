const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function HotelCard({ hotel }) {
  return (
    <article className="hotel-card" aria-labelledby={`hotel-${hotel.id}`}>
      <h3 id={`hotel-${hotel.id}`}>{hotel.name}</h3>
      <p><strong>Location:</strong> {hotel.location}</p>
      {hotel.description && <p>{hotel.description}</p>}

      {hotel.amenities.length > 0 && (
        <ul className="amenities" aria-label="Amenities">
          {hotel.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}
        </ul>
      )}

      {hotel.roomTypes.map((room) => (
        <div className="room-option" key={room.id}>
          <p><strong>{room.name}</strong> — {moneyFormatter.format(room.pricePerNight)} per night</p>
          {room.availableRooms !== null && (
            <p>
              {room.availableRooms === 0
                ? 'Sold out for the selected dates.'
                : `${room.availableRooms} room${room.availableRooms === 1 ? '' : 's'} available.`}
            </p>
          )}
          {room.totalAmount !== null && (
            <p>
              Total for {hotel.nights} night{hotel.nights === 1 ? '' : 's'}:
              {' '}<strong>{moneyFormatter.format(room.totalAmount)}</strong>
            </p>
          )}
        </div>
      ))}
      {hotel.roomTypes.length === 0 && <p>No room options are listed for this hotel.</p>}
    </article>
  );
}
