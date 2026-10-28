import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api';

export default function Overview() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)).catch((e) => setError(errMsg(e))); }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!s) return <p className="text-secondary">Loading…</p>;

  const cards = [['Users', s.users], ['Movies', s.movies], ['Theatres', s.theatres], ['Upcoming shows', s.upcomingShows], ['Confirmed bookings', s.confirmedBookings], ['Net revenue', `₹${s.revenue}`]];
  return (
    <>
      <div className="row g-3 mb-4">
        {cards.map(([k, v]) => (
          <div className="col-6 col-md-4 col-lg-2" key={k}><div className="im-panel h-100"><div className="text-secondary small">{k}</div><div className="fs-4">{v}</div></div></div>
        ))}
      </div>
      <div className="row g-4">
        <div className="col-lg-5">
          <h2 className="h6">Top movies</h2>
          <table className="table table-dark table-sm align-middle"><thead><tr><th>Movie</th><th>Tickets</th><th>Revenue</th></tr></thead>
            <tbody>{s.top.map((t) => <tr key={t._id}><td>{t.title}</td><td>{t.tickets}</td><td>₹{t.revenue}</td></tr>)}
              {!s.top.length && <tr><td colSpan="3" className="text-secondary">No confirmed bookings yet.</td></tr>}</tbody></table>
        </div>
        <div className="col-lg-7">
          <h2 className="h6">Recent bookings</h2>
          <div className="table-responsive"><table className="table table-dark table-sm align-middle"><thead><tr><th>Code</th><th>User</th><th>Movie</th><th>Status</th><th>₹</th></tr></thead>
            <tbody>{s.recent.map((b) => <tr key={b._id}><td>{b.bookingCode}</td><td>{b.user?.name}</td><td>{b.show?.movie?.title}</td><td>{b.status}</td><td>{b.totalAmount}</td></tr>)}</tbody></table></div>
        </div>
      </div>
    </>
  );
}
