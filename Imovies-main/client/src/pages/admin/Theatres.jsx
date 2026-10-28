import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api';

const BLANK = { name: '', city: '', address: '', screens: [{ name: 'Screen 1', rows: 8, seatsPerRow: 10 }] };

export default function Theatres() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => api.get('/theatres').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setScreen = (i, k) => (e) => setForm({ ...form, screens: form.screens.map((s, j) => (j === i ? { ...s, [k]: k === 'name' ? e.target.value : Number(e.target.value) } : s)) });
  const addScreen = () => setForm({ ...form, screens: [...form.screens, { name: `Screen ${form.screens.length + 1}`, rows: 8, seatsPerRow: 10 }] });
  const dropScreen = (i) => setForm({ ...form, screens: form.screens.filter((_, j) => j !== i) });
  const reset = () => { setForm(BLANK); setEditId(null); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/admin/theatres/${editId}`, form);
      else await api.post('/admin/theatres', form);
      toast.success(editId ? 'Theatre updated' : 'Theatre added');
      reset(); load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async (t) => {
    if (!confirm(`Delete ${t.name}?`)) return;
    try { await api.delete(`/admin/theatres/${t._id}`); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <form onSubmit={submit} className="im-panel mb-4">
        <h2 className="h6 mb-3">{editId ? 'Edit theatre' : 'Add theatre'}</h2>
        <div className="row g-2 mb-3">
          <div className="col-md-4"><input className="form-control im-input" placeholder="Name" value={form.name} onChange={set('name')} required aria-label="Theatre name" /></div>
          <div className="col-md-3"><input className="form-control im-input" placeholder="City" value={form.city} onChange={set('city')} required aria-label="City" /></div>
          <div className="col-md-5"><input className="form-control im-input" placeholder="Address" value={form.address} onChange={set('address')} aria-label="Address" /></div>
        </div>
        <div className="text-secondary small mb-1">Screens {editId && '(locked if the theatre already has shows)'}</div>
        {form.screens.map((s, i) => (
          <div className="row g-2 mb-2" key={i}>
            <div className="col-5"><input className="form-control im-input" value={s.name} onChange={setScreen(i, 'name')} required aria-label="Screen name" /></div>
            <div className="col-3"><input type="number" min="1" max="15" className="form-control im-input" value={s.rows} onChange={setScreen(i, 'rows')} aria-label="Rows" /></div>
            <div className="col-3"><input type="number" min="1" max="20" className="form-control im-input" value={s.seatsPerRow} onChange={setScreen(i, 'seatsPerRow')} aria-label="Seats per row" /></div>
            <div className="col-1"><button type="button" className="btn btn-outline-light w-100" disabled={form.screens.length === 1} onClick={() => dropScreen(i)} aria-label="Remove screen">×</button></div>
          </div>
        ))}
        <div className="text-secondary small mb-2">Columns: name · rows · seats per row</div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-light" onClick={addScreen}>Add screen</button>
          <button className="btn im-btn">{editId ? 'Save changes' : 'Add theatre'}</button>
          {editId && <button type="button" className="btn btn-outline-light" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-dark align-middle">
          <thead><tr><th>Theatre</th><th>City</th><th>Screens</th><th></th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t._id}>
                <td>{t.name}<div className="small text-secondary">{t.address}</div></td><td>{t.city}</td>
                <td>{t.screens.map((s) => `${s.name} (${s.rows * s.seatsPerRow})`).join(', ')}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-sm btn-outline-light me-1" onClick={() => { setEditId(t._id); setForm({ name: t.name, city: t.city, address: t.address, screens: t.screens }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                  <button className="btn btn-sm btn-outline-light" onClick={() => remove(t)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
