import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { apiRequest } from '../api.js';
import HotelCard from '../components/HotelCard.jsx';
import { getTodayDateString, nextDate } from '../utils/dates.js';

export default function HotelSearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const apiParams = new URLSearchParams();
  for (const key of ['location', 'checkIn', 'checkOut']) if (params.get(key)) apiParams.set(key, params.get(key));
  const searchQuery = apiParams.toString();
  const [draft, setDraft] = useState({ location: params.get('location') || '', checkIn: params.get('checkIn') || '', checkOut: params.get('checkOut') || '' });
  const [catalog, setCatalog] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [nights, setNights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/hotels', { signal: controller.signal }).then(setCatalog).catch(e => { if (!controller.signal.aborted) setError(e); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const values = new URLSearchParams(searchQuery);
    setDraft({ location: values.get('location') || '', checkIn: values.get('checkIn') || '', checkOut: values.get('checkOut') || '' });
    const apiQuery = new URLSearchParams();
    for (const key of ['location', 'checkIn', 'checkOut']) if (values.get(key)) apiQuery.set(key, values.get(key));
    setLoading(true); setError(null);
    apiRequest(`/hotels?${apiQuery}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setHotels(data); })
      .catch(e => { if (!controller.signal.aborted) { setError(e); setHotels([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [searchQuery]);
  useEffect(() => {
    const controller = new AbortController();
    setNights(null); setQuoteError('');
    if (draft.checkIn && draft.checkOut && draft.checkOut > draft.checkIn && draft.checkIn >= getTodayDateString()) {
      const timer = setTimeout(() => {
        const dates = new URLSearchParams({ checkIn: draft.checkIn, checkOut: draft.checkOut });
        // Nights come from the existing server quote, not a browser calculation.
        apiRequest(`/hotels?${dates}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setNights(data[0]?.nights ?? null); })
          .catch(e => { if (!controller.signal.aborted) setQuoteError(e.message); });
      }, 250);
      return () => { clearTimeout(timer); controller.abort(); };
    }
    return () => controller.abort();
  }, [draft.checkIn, draft.checkOut]);
  function edit(event) { setDraft(current => ({ ...current, [event.target.name]: event.target.value })); }
  function search(event) {
    event.preventDefault(); const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(draft)) { if (value.trim()) next.set(key, value.trim()); else next.delete(key); }
    setParams(next);
  }
  function filter(key, value) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next); }
  const amenity = params.get('amenity') || '';
  const sort = params.get('sort') || '';
  const visible = hotels.filter(hotel => !amenity || hotel.amenities.includes(amenity));
  // Compare the first listed room price, without inventing a hotel price or total.
  if (sort) visible.sort((a, b) => {
    if (!a.roomTypes.length) return b.roomTypes.length ? 1 : 0;
    if (!b.roomTypes.length) return -1;
    return (Number(a.roomTypes[0].pricePerNight) - Number(b.roomTypes[0].pricePerNight)) * (sort === 'desc' ? -1 : 1);
  });
  const fields = error?.fieldErrors || {};
  return <>
    <p className="eyebrow">Your next change of scene</p><h1>Find your next stay</h1>
    <p className="muted">Choose a city and your dates. Compare rooms with totals calculated for your stay.</p>
    <form className="search-form" onSubmit={search}>
      <div className="form-field"><label htmlFor="location">Location</label><input id="location" list="locations" name="location" value={draft.location} onChange={edit} placeholder="Where are you heading?" /><datalist id="locations">{[...new Set(catalog.map(h => h.location))].map(city => <option key={city} value={city} />)}</datalist></div>
      {['checkIn', 'checkOut'].map(key => <div className="form-field" key={key}><label htmlFor={key}>{key === 'checkIn' ? 'Check-in' : 'Check-out'}</label><input id={key} name={key} type="date" min={key === 'checkIn' ? getTodayDateString() : nextDate(draft.checkIn)} value={draft[key]} onChange={edit} aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `${key}-error` : undefined} />{fields[key] && <span id={`${key}-error`} className="field-error">{fields[key]}</span>}</div>)}
      <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
      <p className="search-hint" role="status">{nights != null ? `${nights} night${nights === 1 ? '' : 's'}` : 'Add both dates to see nights and availability.'}</p>
    </form>
    {quoteError && <p className="error-message" role="alert">{quoteError}</p>}
    {error && <p className="error-message" role="alert">{error.message}</p>}
    <section className="results-section" aria-labelledby="results-heading" aria-busy={loading}>
      <div className="section-heading"><div><h2 id="results-heading">Explore hotels</h2><p role="status">{loading ? 'Loading hotels…' : `${visible.length} hotels found.`}</p></div>
        <div className="result-controls"><div className="form-field"><label htmlFor="amenity">Filter by amenity</label><select id="amenity" value={amenity} onChange={e => filter('amenity', e.target.value)}><option value="">All amenities</option>{[...new Set(catalog.flatMap(h => h.amenities))].sort().map(item => <option key={item}>{item}</option>)}</select></div>
        <div className="form-field"><label htmlFor="sort">Sort by price</label><select id="sort" value={sort} onChange={e => filter('sort', e.target.value)}><option value="">Recommended order</option><option value="asc">Low to high</option><option value="desc">High to low</option></select></div></div>
      </div>
      {sort && <p className="muted">Sorted by the nightly price of each hotel's first listed room.</p>}
      {!loading && !error && <div className="hotel-list">{visible.map(h => <HotelCard key={h.id} hotel={h} search={query} />)}</div>}
      {!loading && !error && visible.length === 0 && <p>No hotels match. Try another location or amenity.</p>}
    </section>
  </>;
}
