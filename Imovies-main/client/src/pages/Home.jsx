import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Poster from '../components/Poster';
import Pagination from '../components/Pagination';

const EMPTY = { q: '', genre: '', language: '', city: '', theatre: '', date: '' };
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

export default function Home() {
  const [filters, setFilters] = useState(EMPTY);
  const [options, setOptions] = useState({ genres: [], languages: [], cities: [], theatres: [] });
  const [result, setResult] = useState({ data: [], page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/movies/filters').then((r) => setOptions(r.data)).catch(() => {}); }, []);

  // debounce so typing in search does not fire a request per key
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = Object.fromEntries(Object.entries({ ...filters, page, limit: 8 }).filter(([, v]) => v));
      api.get('/movies', { params })
        .then((r) => { setResult(r.data); setError(''); })
        .catch((e) => setError(errMsg(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [filters, page]);

  const set = (k) => (e) => {
    const next = { ...filters, [k]: e.target.value };
    if (k === 'city') next.theatre = ''; // theatre list depends on city
    setFilters(next);
    setPage(1);
  };
  const theatres = options.theatres.filter((t) => !filters.city || t.city === filters.city);
  const active = Object.values(filters).some(Boolean);

  return (
    <div className="container py-4">
      <h1 className="h2 mb-1">Now showing</h1>
      <p className="text-secondary">Find a movie, pick a show, book your seats.</p>

      <div className="row g-2 mb-4">
        <div className="col-12 col-md-4"><input className="form-control im-input" placeholder="Search by title" value={filters.q} onChange={set('q')} aria-label="Search by title" /></div>
        <div className="col-6 col-md-2">
          <select className="form-select im-input" value={filters.genre} onChange={set('genre')} aria-label="Genre">
            <option value="">All genres</option>{options.genres.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select className="form-select im-input" value={filters.language} onChange={set('language')} aria-label="Language">
            <option value="">All languages</option>{options.languages.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select className="form-select im-input" value={filters.city} onChange={set('city')} aria-label="City">
            <option value="">All cities</option>{options.cities.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select className="form-select im-input" value={filters.theatre} onChange={set('theatre')} aria-label="Theatre">
            <option value="">All theatres</option>{theatres.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3"><input type="date" min={today()} className="form-control im-input" value={filters.date} onChange={set('date')} aria-label="Show date" /></div>
        {active && <div className="col-6 col-md-2"><button className="btn btn-outline-light w-100" onClick={() => { setFilters(EMPTY); setPage(1); }}>Clear filters</button></div>}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && !result.data.length && <p className="text-secondary">Loading movies…</p>}
      {!loading && !error && !result.data.length && <p className="text-secondary">No movies match these filters.</p>}

      <div className="row g-4">
        {result.data.map((m) => (
          <div className="col-6 col-md-4 col-lg-3" key={m._id}>
            <Link to={`/movie/${m._id}`} className="text-decoration-none">
              <Poster movie={m} />
              <div className="mt-2 text-light fw-semibold">{m.title}</div>
              <div className="small text-secondary">{m.language} · {m.duration} min · ★ {m.rating}</div>
            </Link>
          </div>
        ))}
      </div>
      <Pagination page={result.page} pages={result.pages} onChange={setPage} />
    </div>
  );
}
