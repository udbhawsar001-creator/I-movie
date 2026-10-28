import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api';

const fmt = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [left, setLeft] = useState(0);
  const [method, setMethod] = useState('card');
  const [form, setForm] = useState({ cardNumber: '', upiId: '' });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then((r) => {
      if (r.data.booking.status === 'confirmed') return navigate(`/booking/${bookingId}`, { replace: true });
      setData(r.data);
    }).catch((e) => setError(errMsg(e)));
  }, [bookingId, navigate]);

  // countdown to hold expiry
  useEffect(() => {
    if (!data) return;
    const end = new Date(data.booking.expiresAt).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data]);

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return <div className="container py-4 text-secondary">Loading…</div>;

  const { booking } = data;
  const expired = booking.status !== 'pending' || left === 0;
  const show = booking.show;

  const pay = async () => {
    setBusy(true);
    setFailure('');
    try {
      await api.post('/payments', { bookingId, method, ...(method === 'card' ? { cardNumber: form.cardNumber } : {}), ...(method === 'upi' ? { upiId: form.upiId } : {}) });
      toast.success('Payment successful');
      navigate(`/booking/${bookingId}`, { replace: true });
    } catch (e) {
      const status = e.response?.status;
      if (status === 410) { toast.error(errMsg(e)); navigate(`/book/${show._id}`, { replace: true }); }
      else setFailure(errMsg(e)); // 402 declined / 400 invalid: stay and retry
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    try { await api.patch(`/bookings/${bookingId}/cancel`); toast.info('Seats released'); navigate(`/book/${show._id}`); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 560 }}>
      <h1 className="h3 mb-3">Payment</h1>
      <div className="im-panel mb-3">
        <div className="fw-semibold">{show.movie.title}</div>
        <div className="small text-secondary">{show.theatre.name}, {show.theatre.city} · {show.screen} · {new Date(show.startTime).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
        <div className="mt-2">Seats: {booking.seats.join(', ')}</div>
        <div className="fs-5 mt-1">Total ₹{booking.totalAmount}</div>
      </div>

      {expired ? (
        <div className="alert alert-warning">Your seat hold has expired. <button className="btn btn-sm im-btn ms-2" onClick={() => navigate(`/book/${show._id}`)}>Pick seats again</button></div>
      ) : (
        <>
          <div className="small text-secondary mb-3">Seats held for <strong className="text-light">{fmt(left)}</strong></div>
          <div className="btn-group w-100 mb-3" role="group" aria-label="Payment method">
            {['card', 'upi', 'wallet'].map((m) => (
              <button key={m} type="button" className={`btn ${method === m ? 'im-btn' : 'btn-outline-light'}`} onClick={() => { setMethod(m); setFailure(''); }}>
                {m === 'upi' ? 'UPI' : m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {method === 'card' && (
            <div className="mb-3">
              <label className="form-label" htmlFor="card">Card number</label>
              <input id="card" className="form-control im-input" inputMode="numeric" maxLength={19} placeholder="4111 1111 1111 1111" value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} />
              <div className="form-text">Demo only. 4111 1111 1111 1111 succeeds, a number ending 0000 is declined.</div>
            </div>
          )}
          {method === 'upi' && (
            <div className="mb-3">
              <label className="form-label" htmlFor="upi">UPI ID</label>
              <input id="upi" className="form-control im-input" placeholder="name@bank" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
              <div className="form-text">Demo only. An ID ending @fail is declined.</div>
            </div>
          )}
          {method === 'wallet' && <p className="text-secondary">Demo wallet. Pays instantly.</p>}

          {failure && <div className="alert alert-danger py-2" role="alert">{failure}. You can try again before the timer ends.</div>}

          <div className="d-flex gap-2">
            <button className="btn im-btn flex-grow-1" disabled={busy} onClick={pay}>{busy ? 'Processing…' : `Pay ₹${booking.totalAmount}`}</button>
            <button className="btn btn-outline-light" disabled={busy} onClick={cancel}>Release seats</button>
          </div>
        </>
      )}
    </div>
  );
}
