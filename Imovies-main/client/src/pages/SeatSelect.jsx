import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api';
import { ensureSocket } from '../socket';

const MAX_SEATS = 6;

export default function SeatSelect() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadSeats = useCallback(
    () => api.get(`/shows/${showId}/seats`).then((r) => {
      setSeats(r.data);
      // drop picks someone else just took
      const free = new Set(r.data.filter((s) => s.status === 'available' || s.mine).map((s) => s.label));
      setSelected((cur) => cur.filter((l) => free.has(l)));
    }),
    [showId]
  );

  useEffect(() => {
    api.get(`/shows/${showId}`).then((r) => setShow(r.data)).catch((e) => setError(errMsg(e)));
    loadSeats().catch((e) => setError(errMsg(e)));

    // real-time: server pings whenever any seat in this show changes
    const socket = ensureSocket();
    const join = () => socket.emit('show:join', showId);
    const onChange = (p) => p.showId === showId && loadSeats().catch(() => {});
    join();
    socket.on('connect', join);
    socket.on('seats:changed', onChange);
    return () => { socket.emit('show:leave', showId); socket.off('connect', join); socket.off('seats:changed', onChange); };
  }, [showId, loadSeats]);

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!show || !seats.length) return <div className="container py-4 text-secondary">Loading…</div>;

  const rows = [...new Set(seats.map((s) => s.label[0]))];
  const rowSeats = (r) => seats.filter((s) => s.label[0] === r);

  const toggle = (seat) => {
    if (seat.status === 'booked' || (seat.status === 'held' && !seat.mine)) return;
    setSelected((cur) => {
      if (cur.includes(seat.label)) return cur.filter((l) => l !== seat.label);
      if (cur.length >= MAX_SEATS) { toast.warn(`You can book up to ${MAX_SEATS} seats at a time.`); return cur; }
      return [...cur, seat.label];
    });
  };

  const hold = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/bookings', { showId, seats: selected });
      navigate(`/pay/${data._id}`);
    } catch (e) {
      toast.error(errMsg(e));
      setSelected([]);
      loadSeats().catch(() => {});
    } finally { setBusy(false); }
  };

  const when = new Date(show.startTime).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="container py-4" style={{ maxWidth: 820 }}>
      <h1 className="h3 mb-1">{show.movie.title}</h1>
      <p className="text-secondary">{show.theatre.name}, {show.theatre.city} · {show.screen} · {when} · ₹{show.price} per seat</p>

      <div className="im-screen" aria-hidden="true">Screen this way</div>
      <div className="im-seatgrid" role="group" aria-label="Seat map">
        {rows.map((r) => (
          <div className="im-seatrow" key={r}>
            <span className="im-rowlabel">{r}</span>
            {rowSeats(r).map((s) => {
              const sel = selected.includes(s.label);
              const taken = s.status === 'booked' || (s.status === 'held' && !s.mine);
              return (
                <button key={s.label} type="button" disabled={taken} onClick={() => toggle(s)}
                  className={`im-seat ${s.status === 'booked' ? 'booked' : taken ? 'held' : sel ? 'selected' : ''}`}
                  aria-label={`Seat ${s.label}${s.status === 'booked' ? ', booked' : taken ? ', held by another user' : sel ? ', selected' : ''}`} aria-pressed={sel}>
                  {s.label.slice(1)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="d-flex gap-3 flex-wrap small text-secondary justify-content-center my-3">
        <span><i className="im-key"></i> Available</span>
        <span><i className="im-key selected"></i> Your pick</span>
        <span><i className="im-key held"></i> Being paid for</span>
        <span><i className="im-key booked"></i> Booked</span>
      </div>

      <div className="d-flex justify-content-between align-items-center im-bar">
        <div>
          <div>{selected.length ? [...selected].sort().join(', ') : 'No seats selected'}</div>
          <div className="text-secondary small">Total ₹{selected.length * show.price}</div>
        </div>
        <button className="btn im-btn" disabled={!selected.length || busy} onClick={hold}>{busy ? 'Holding seats…' : 'Continue to payment'}</button>
      </div>
    </div>
  );
}
