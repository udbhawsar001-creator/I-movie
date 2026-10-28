import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api';
import Pagination from '../../components/Pagination';

export default function Shows() {
  const [res, setRes] = useState({ data: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [form, setForm] = useState({ movie: '', theatre: '', screen: '', startTime: '', price: 200 });

  const load = useCallback(() => api.get('/admin/shows', { params: { page, limit: 10 } }).then((r) => setRes(r.data)).catch((e) => toast.error(errMsg(e))), [page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/movies', { params: { limit: 50 } }).then((r) => setMovies(r.data.data.filter((m) => m.isActive)));
    api.get('/theatres').then((r) => setTheatres(r.data));
  }, []);

  const theatre = theatres.find((t) => t._id === form.theatre);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value, ...(k === 'theatre' ? { screen: '' } : {}) });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/shows', form);
      toast.success('Show created, seats generated');
      setForm({ ...form, startTime: '' });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async (s) => {
    if (!confirm('Delete this show?')) return;
    try { await api.delete(`/admin/shows/${s._id}`); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const reprice = async (s) => {
    const v = prompt('New ticket price (₹)', s.price);
    if (v === null) return;
    try { await api.put(`/admin/shows/${s._id}`, { price: Number(v) }); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <form onSubmit={submit} className="im-panel mb-4">
        <h2 className="h6 mb-3">Schedule a show</h2>
        <div className="row g-2">
          <div className="col-md-4">
            <select className="form-select im-input" value={form.movie} onChange={set('movie')} required aria-label="Movie"><option value="">Movie…</option>{movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}</select>
          </div>
          <div className="col-md-4">
            <select className="form-select im-input" value={form.theatre} onChange={set('theatre')} required aria-label="Theatre"><option value="">Theatre…</option>{theatres.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.city})</option>)}</select>
          </div>
          <div className="col-md-4">
            <select className="form-select im-input" value={form.screen} onChange={set('screen')} required disabled={!theatre} aria-label="Screen"><option value="">Screen…</option>{theatre?.screens.map((s) => <option key={s.name}>{s.name}</option>)}</select>
          </div>
          <div className="col-md-5"><input type="datetime-local" className="form-control im-input" value={form.startTime} onChange={set('startTime')} required aria-label="Start time" /></div>
          <div className="col-md-3"><input type="number" min="0" className="form-control im-input" value={form.price} onChange={set('price')} required aria-label="Price" /></div>
          <div className="col-md-4"><button className="btn im-btn w-100">Create show</button></div>
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-dark align-middle">
          <thead><tr><th>Movie</th><th>Theatre</th><th>Screen</th><th>When</th><th>₹</th><th></th></tr></thead>
          <tbody>
            {res.data.map((s) => (
              <tr key={s._id} className={new Date(s.startTime) < new Date() ? 'opacity-50' : ''}>
                <td>{s.movie?.title}</td><td>{s.theatre?.name}, {s.theatre?.city}</td><td>{s.screen}</td>
                <td>{new Date(s.startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td><td>{s.price}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-sm btn-outline-light me-1" onClick={() => reprice(s)}>Price</button>
                  <button className="btn btn-sm btn-outline-light" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={res.page} pages={res.pages} onChange={setPage} />
    </>
  );
}
