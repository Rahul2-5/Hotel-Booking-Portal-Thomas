// Optional owner-supplied photos are discovered at build time. No remote images.
const photos = import.meta.glob('/public/hotels/*.{jpg,jpeg,png,webp,avif}', { eager: true, query: '?url', import: 'default' });
export default function HotelImage({ hotelId, city = 'Your next stay', className = '' }) {
  const photo = Object.entries(photos).find(([path]) => path.split('/').pop().split('.')[0] === String(hotelId));
  return <div className={`hotel-cover cover-${Number(hotelId) % 3} ${className}`}>
    {photo ? <img src={photo[1]} alt={`${city} hotel`} loading="lazy" width="800" height="450" /> : <>
      <span className="cover-label">Discover</span><span className="cover-city">{city}</span>
    </>}
  </div>;
}
