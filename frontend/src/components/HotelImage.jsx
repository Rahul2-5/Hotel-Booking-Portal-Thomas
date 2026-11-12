import { useState } from 'react';
import { hotelImages } from '../data/hotelImages.js';

export default function HotelImage({ hotelId, className = '', eager = false }) {
  const photo = hotelImages[hotelId];
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`hotel-image ${className}`}>
      {photo && !failed ? (
        <img
          src={`/images/hotels/${photo.file}-800.webp`}
          srcSet={`/images/hotels/${photo.file}-800.webp 800w, /images/hotels/${photo.file}-1400.webp 1400w`}
          sizes={className === 'detail-image' ? '(max-width: 640px) 100vw, 1120px' : '(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 560px'}
          alt={photo.alt}
          width={1400}
          height={933}
          style={{ objectPosition: photo.position || 'center' }}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="image-fallback">Hotel photo unavailable</div>
      )}
      {photo && !failed && <figcaption>Illustrative photo</figcaption>}
    </figure>
  );
}
