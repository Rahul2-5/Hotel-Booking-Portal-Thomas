import { Link, NavLink, Route, Routes } from 'react-router';
import HotelSearchPage from './pages/HotelSearchPage.jsx';
import HotelDetailsPage from './pages/HotelDetailsPage.jsx';
import BookingConfirmationPage from './pages/BookingConfirmationPage.jsx';
import ManageBookingPage from './pages/ManageBookingPage.jsx';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <Link className="site-brand" to="/">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">Hotel Booking Portal<small>Stays across India</small></span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>Hotel search</NavLink>
          <NavLink to="/manage-booking">Manage booking</NavLink>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HotelSearchPage />} />
          <Route path="/hotels/:id" element={<HotelDetailsPage />} />
          <Route path="/bookings/confirmation" element={<BookingConfirmationPage />} />
          <Route path="/manage-booking" element={<ManageBookingPage />} />
          <Route
            path="*"
            element={
              <section>
                <h1>Page not found</h1>
                <Link to="/">Back to hotel search</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div><p className="footer-title">A good stay starts with a simple plan.</p><p>Find a hotel, choose your dates and make it yours.</p></div>
        <Link to="/manage-booking">Already booked? Manage your stay <span aria-hidden="true">→</span></Link>
      </footer>
    </>
  );
}
