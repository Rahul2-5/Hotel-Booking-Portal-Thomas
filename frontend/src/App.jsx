import { Link, Route, Routes } from 'react-router';
import HotelSearchPage from './pages/HotelSearchPage.jsx';
import HotelDetailsPage from './pages/HotelDetailsPage.jsx';
import BookingConfirmationPage from './pages/BookingConfirmationPage.jsx';
import ManageBookingPage from './pages/ManageBookingPage.jsx';

export default function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/">Hotel Booking Portal</Link>
        <nav aria-label="Main navigation">
          <Link to="/">Hotel search</Link>
          <Link to="/manage-booking">Manage booking</Link>
        </nav>
      </header>
      <main>
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
    </>
  );
}
