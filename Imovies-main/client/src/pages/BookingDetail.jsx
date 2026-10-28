import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';

export default function BookingDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/bookings/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))); }, [id]);

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return <div className="container py-4 text-secondary">Loading…</div>;

  const { booking: b, payment } = data;
  const s = b.show;
  const ok = b.status === 'confirmed';

  return (
    <div className="container py-4" style={{ maxWidth: 560 }}>
      {ok && <div className="alert alert-success">Booking confirmed. A copy is in your alerts.</div>}
      {!ok && <div className="alert alert-secondary">This booking is {b.status}.</div>}
      <div className="im-ticket flex-column">
        <div className="d-flex justify-content-between"><span className="text-secondary small">Booking code</span><strong className="im-code">{b.bookingCode}</strong></div>
        <div className="fs-5">{s.movie.title}</div>
        <div className="text-secondary small">{s.theatre.name}, {s.theatre.city}{s.theatre.address ? ` · ${s.theatre.address}` : ''}</div>
        <div>{new Date(s.startTime).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })} · {s.screen}</div>
        <div>Seats: <strong>{b.seats.join(', ')}</strong></div>
        <div>Paid ₹{b.totalAmount}{payment ? ` via ${payment.method} · ${payment.transactionId}` : ''}</div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <Link className="btn im-btn" to="/bookings">My bookings</Link>
        <button className="btn btn-outline-light" onClick={() => window.print()}>Print ticket</button>
      </div>
    </div>
  );
}
