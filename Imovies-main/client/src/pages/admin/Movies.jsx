import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api';
import Pagination from '../../components/Pagination';

const BLANK = { title: '', description: '', genre: '', language: '', duration: 120, rating: 7, releaseDate: '' };

export default function Movies() {
  const [res, setRes] = useState({ data: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(BLANK);
  const [poster, setPoster] = useState(null);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => api.get('/admin/movies', { params: { page, limit: 8 } }).then((r) => setRes(r.data)).catch((e) => toast.error(errMsg(e))), [page]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setForm(BLANK); setPoster(null); setEditId(null); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));
    if (poster) fd.append('poster', poster);
    try {
      if (editId) await api.put(`/admin/movies/${editId}`, fd);
      else await api.post('/admin/movies', fd);
      toast.success(editId ? 'Movie updated' : 'Movie added');
      reset(); load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const edit = (m) => {
    setEditId(m._id);
    setForm({ title: m.title, description: m.description, genre: m.genre, language: m.language, duration: m.duration, rating: m.rating, releaseDate: m.releaseDate ? m.releaseDate.slice(0, 10) : '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggle = async (m) => {
    try {
      if (m.isActive) await api.delete(`/admin/movies/${m._id}`);
      else await api.put(`/admin/movies/${m._id}`, { isActive: true });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <form onSubmit={submit} className="im-panel mb-4">
        <h2 className="h6 mb-3">{editId ? 'Edit movie' : 'Add movie'}</h2>
        <div className="row g-2">
          <div className="col-md-6"><input className="form-control im-input" placeholder="Title" value={form.title} onChange={set('title')} required aria-label="Title" /></div>
          <div className="col-md-3"><input className="form-control im-input" placeholder="Genre" value={form.genre} onChange={set('genre')} required aria-label="Genre" /></div>
          <div className="col-md-3"><input className="form-control im-input" placeholder="Language" value={form.language} onChange={set('language')} required aria-label="Language" /></div>
          <div className="col-md-2"><input type="number" min="30" max="400" className="form-control im-input" placeholder="Minutes" value={form.duration} onChange={set('duration')} required aria-label="Duration in minutes" /></div>
          <div className="col-md-2"><input type="number" min="0" max="10" step="0.1" className="form-control im-input" placeholder="Rating" value={form.rating} onChange={set('rating')} aria-label="Rating" /></div>
          <div className="col-md-3"><input type="date" className="form-control im-input" value={form.releaseDate} onChange={set('releaseDate')} aria-label="Release date" /></div>
          <div className="col-md-5"><input type="file" accept="image/png,image/jpeg,image/webp" className="form-control im-input" onChange={(e) => setPoster(e.target.files[0])} aria-label="Poster image" /></div>
          <div className="col-12"><textarea rows="2" className="form-control im-input" placeholder="Description" value={form.description} onChange={set('description')} aria-label="Description" /></div>
        </div>
        <div className="mt-3 d-flex gap-2">
          <button className="btn im-btn">{editId ? 'Save changes' : 'Add movie'}</button>
          {editId && <button type="button" className="btn btn-outline-light" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-dark align-middle">
          <thead><tr><th>Title</th><th>Genre</th><th>Language</th><th>Min</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {res.data.map((m) => (
              <tr key={m._id} className={m.isActive ? '' : 'opacity-50'}>
                <td>{m.title}</td><td>{m.genre}</td><td>{m.language}</td><td>{m.duration}</td><td>{m.isActive ? 'Listed' : 'Hidden'}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-sm btn-outline-light me-1" onClick={() => edit(m)}>Edit</button>
                  <button className="btn btn-sm btn-outline-light" onClick={() => toggle(m)}>{m.isActive ? 'Hide' : 'Show'}</button>
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
