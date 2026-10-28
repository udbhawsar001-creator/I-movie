import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api';
import Pagination from '../components/Pagination';

const BADGE = { confirmed: 'text-success', pending: 'text-warning', cancelled: 'text-danger', expired: 'text-secondary' };

export default function MyBookings() {
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/bookings/my', { params: { type: tab, page, limit: 5 } })
      .then((r) => setRes(r.data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [tab, page]);
  useEffect(() => { load(); }, [load]);

  const cancel = async (b) => {
    if (!confirm(b.status === 'confirmed' ? 'Cancel this booking? Your payment will be refunded.' : 'Release these held seats?')) return;
    try { await api.patch(`/bookings/${b._id}/cancel`); toast.success('Booking cancelled'); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      <h1 className="h3 mb-3">My bookings</h1>
      <div className="btn-group mb-3" role="group" aria-label="Booking type">
        {[['upcoming', 'Upcoming'], ['past', 'Past & cancelled']].map(([k, label]) => (
          <button key={k} className={`btn ${tab === k ? 'im-btn' : 'btn-outline-light'}`} onClick={() => { setTab(k); setPage(1); }}>{label}</button>
        ))}
      </div>

      {loading && !res.data.length && <p className="text-secondary">Loading…</p>}
      {!loading && !res.data.length && <p className="text-secondary">{tab === 'upcoming' ? 'No upcoming bookings.' : 'Nothing here yet.'} <Link to="/">Browse movies</Link></p>}

      {res.data.map((b) => (
        <div key={b._id} className={`im-ticket mb-3 ${['cancelled', 'expired'].includes(b.status) ? 'cancelled' : ''}`}>
          <div className="flex-grow-1">
            <div className="fw-semibold">{b.movie.title}</div>
            <div className="small text-secondary">{b.theatre.name}, {b.theatre.city} · {b.show.screen}</div>
            <div className="small text-secondary">{fmt(b.show.startTime)}</div>
            <div className="mt-1">Seats: {b.seats.join(', ')} · ₹{b.totalAmount} · <span className="text-secondary">{b.bookingCode}</span></div>
          </div>
          <div className="text-end">
            <div className={`small mb-2 text-capitalize ${BADGE[b.status]}`}>{b.status === 'pending' ? 'Awaiting payment' : b.status}</div>
            {b.status === 'confirmed' && <Link className="btn btn-sm btn-outline-light me-1" to={`/booking/${b._id}`}>Ticket</Link>}
            {b.status === 'pending' && <Link className="btn btn-sm im-btn me-1" to={`/pay/${b._id}`}>Pay now</Link>}
            {['confirmed', 'pending'].includes(b.status) && new Date(b.show.startTime) > new Date() && (
              <button className="btn btn-sm btn-outline-light" onClick={() => cancel(b)}>Cancel</button>
            )}
          </div>
        </div>
      ))}
      <Pagination page={res.page} pages={res.pages} onChange={setPage} />
    </div>
  );
}
