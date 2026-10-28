import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LiveNotifications from './components/LiveNotifications';
import { loadUser, logout } from './store/authSlice';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import SeatSelect from './pages/SeatSelect';
import Payment from './pages/Payment';
import BookingDetail from './pages/BookingDetail';
import MyBookings from './pages/MyBookings';
import AuthForm from './pages/AuthForm';
import AdminLayout from './pages/admin/AdminLayout';
import Overview from './pages/admin/Overview';
import AdminMovies from './pages/admin/Movies';
import AdminTheatres from './pages/admin/Theatres';
import AdminShows from './pages/admin/Shows';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem('imovies_token')) dispatch(loadUser());
    const expired = () => { dispatch(logout()); toast.warn('Session expired. Please log in again.'); };
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, [dispatch]);

  return (
    <>
      <Navbar />
      <LiveNotifications />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/book/:showId" element={<ProtectedRoute><SeatSelect /></ProtectedRoute>} />
        <Route path="/pay/:bookingId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/booking/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Overview />} />
          <Route path="movies" element={<AdminMovies />} />
          <Route path="theatres" element={<AdminTheatres />} />
          <Route path="shows" element={<AdminShows />} />
        </Route>
        <Route path="*" element={<div className="container py-5 text-secondary">Page not found.</div>} />
      </Routes>
    </>
  );
}
