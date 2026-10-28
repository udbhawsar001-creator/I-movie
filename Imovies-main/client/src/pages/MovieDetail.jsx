import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import Poster from '../components/Poster';

const dayLabel = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const timeLabel = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function MovieDetail() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/movies/${id}`).then((r) => setMovie(r.data)).catch((e) => setError(errMsg(e))); }, [id]);
  useEffect(() => {
    api.get(`/shows/movie/${id}`, { params: date ? { date } : {} }).then((r) => setShows(r.data)).catch((e) => setError(errMsg(e)));
  }, [id, date]);

  // theatre -> day -> shows
  const grouped = useMemo(() => {
    const map = new Map();
    shows.forEach((s) => {
      const key = s.theatre._id;
      if (!map.has(key)) map.set(key, { theatre: s.theatre, days: {} });
      (map.get(key).days[dayLabel(s.startTime)] ||= []).push(s);
    });
    return [...map.values()];
  }, [shows]);

  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div></div>;
  if (!movie) return <div className="container py-4 text-secondary">Loading…</div>;

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-md-4 col-lg-3"><Poster movie={movie} /></div>
        <div className="col-md-8 col-lg-9">
          <h1 className="h2">{movie.title}</h1>
          <p className="text-secondary">{movie.genre} · {movie.language} · {movie.duration} min · ★ {movie.rating}</p>
          <p>{movie.description}</p>

          <div className="d-flex align-items-center justify-content-between mt-4 mb-3 flex-wrap gap-2">
            <h2 className="h5 mb-0">Choose a show</h2>
            <input type="date" className="form-control im-input w-auto" min={new Date().toLocaleDateString('en-CA')} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by date" />
          </div>
          {!grouped.length && <p className="text-secondary">No upcoming shows{date ? ' on this date' : ''}.</p>}
          {grouped.map(({ theatre, days }) => (
            <div key={theatre._id} className="im-panel mb-3">
              <div className="fw-semibold">{theatre.name} <span className="text-secondary fw-normal">· {theatre.city}</span></div>
              {Object.entries(days).map(([day, list]) => (
                <div key={day} className="mt-2">
                  <div className="text-secondary small mb-1">{day}</div>
                  <div className="d-flex flex-wrap gap-2">
                    {list.map((s) => (
                      <Link key={s._id} to={`/book/${s._id}`} className={`im-show ${s.seatsLeft === 0 ? 'disabled' : ''}`} aria-disabled={s.seatsLeft === 0}>
                        <strong>{timeLabel(s.startTime)}</strong>
                        <span className="small">₹{s.price} · {s.screen}</span>
                        <span className="small text-secondary">{s.seatsLeft === 0 ? 'Sold out' : `${s.seatsLeft} left`}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
