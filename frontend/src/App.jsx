import { Link, Route, Routes } from 'react-router';
import HotelSearchPage from './pages/HotelSearchPage.jsx';

export default function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/">Hotel Booking Portal</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HotelSearchPage />} />
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
