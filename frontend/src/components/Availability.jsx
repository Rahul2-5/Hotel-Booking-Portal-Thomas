export default function Availability({ rooms }) {
  if (rooms == null) return <p className="muted">Choose dates to check availability.</p>;
  if (rooms === 0) return <p className="error-message">Sold out for the selected dates.</p>;
  return <p className={rooms <= 3 ? 'low-availability' : 'availability-note'}>
    {rooms <= 3 ? `Only ${rooms} room${rooms === 1 ? '' : 's'} left` : `${rooms} rooms available`}
  </p>;
}
