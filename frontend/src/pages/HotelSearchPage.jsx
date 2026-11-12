import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import HotelCard from '../components/HotelCard.jsx';
import HotelImage from '../components/HotelImage.jsx';
import { getTodayDateString } from '../utils/dates.js';

const emptyFilters = { location: '', checkIn: '', checkOut: '' };

export default function HotelSearchPage() {
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [search, setSearch] = useState({ ...emptyFilters });
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const today = getTodayDateString();
  const fieldErrors = error?.fieldErrors || {};

  useEffect(() => {
    const controller = new AbortController();

    async function loadHotels() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(search)) {
        if (value) {
          params.set(name, value);
        }
      }

      try {
        const query = params.toString();
        const data = await apiRequest(`/hotels${query ? `?${query}` : ''}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setHotels(data);
        }
      } catch (requestError) {
        if (controller.signal.aborted || requestError.name === 'AbortError') {
          return;
        }
        setHotels([]);
        setError(requestError);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadHotels();
    // Cancel the old request when a new search starts or the page unmounts.
    return () => controller.abort();
  }, [search]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    // Date inputs already provide YYYY-MM-DD. Send them without timezone conversion.
    setSearch({ ...filters, location: filters.location.trim() });
  }

  function clearSearch() {
    setFilters({ ...emptyFilters });
    setSearch({ ...emptyFilters });
  }

  return (
    <>
      <section className="search-hero" aria-labelledby="search-heading">
        <div className="page-intro">
          <p className="eyebrow">A change of scene starts here</p>
          <h1 id="search-heading">Find a hotel.<br /><em>Feel at home.</em></h1>
          <p>From city breaks to quieter escapes, find a stay that suits you. Choose your dates, compare rooms and book with a clear total.</p>
          <a className="hero-link" href="#hotel-search">Find your stay <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero-visual">
          <HotelImage hotelId={3} className="hero-image" eager />
          <p className="hero-caption"><span>Somewhere a little slower.</span><small>Inspiration from the Kerala backwaters</small></p>
        </div>
      </section>

      <section className="search-panel" aria-labelledby="plan-stay-heading">
      <div className="search-panel-heading">
        <h2 id="plan-stay-heading">Plan your stay</h2>
        <p>Search by location. Add both dates to see availability and stay totals.</p>
      </div>
      <form id="hotel-search" className="search-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            name="location"
            value={filters.location}
            onChange={handleChange}
            placeholder="e.g. Mumbai"
            aria-invalid={Boolean(fieldErrors.location)}
            aria-describedby={fieldErrors.location ? 'location-error' : undefined}
          />
          {fieldErrors.location && <span className="field-error" id="location-error">{fieldErrors.location}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="checkIn">Check-in</label>
          <input
            id="checkIn"
            name="checkIn"
            type="date"
            value={filters.checkIn}
            min={today}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.checkIn)}
            aria-describedby={fieldErrors.checkIn ? 'checkIn-error' : undefined}
          />
          {fieldErrors.checkIn && <span className="field-error" id="checkIn-error">{fieldErrors.checkIn}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="checkOut">Check-out</label>
          <input
            id="checkOut"
            name="checkOut"
            type="date"
            value={filters.checkOut}
            min={filters.checkIn || today}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.checkOut)}
            aria-describedby={fieldErrors.checkOut ? 'checkOut-error' : undefined}
          />
          {fieldErrors.checkOut && <span className="field-error" id="checkOut-error">{fieldErrors.checkOut}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
          <button className="button-secondary" type="button" onClick={clearSearch}>Clear</button>
        </div>
      </form>
      </section>

      {error && <p className="error-message" role="alert">{error.message}</p>}

      <section className="results-section" aria-labelledby="results-heading" aria-busy={loading}>
        <div className="section-heading">
          <div><p className="eyebrow">Find your kind of getaway</p><h2 id="results-heading">Explore our hotels</h2></div>
          <p role="status">
            {loading
              ? 'Loading hotels…'
              : error
                ? 'Search could not be completed.'
                : `${hotels.length} hotel${hotels.length === 1 ? '' : 's'} found.`}
          </p>
        </div>
        {!loading && !error && hotels.length === 0 && (
          <p>No hotels match this location. Try another location or clear the search.</p>
        )}
        {!loading && !error && (
          <div className="hotel-list">
            {hotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)}
          </div>
        )}
      </section>
    </>
  );
}
