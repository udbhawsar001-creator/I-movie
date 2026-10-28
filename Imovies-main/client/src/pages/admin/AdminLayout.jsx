import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">Admin dashboard</h1>
      <div className="btn-group mb-4 flex-wrap" role="group" aria-label="Admin sections">
        {[['/admin', 'Overview', true], ['/admin/movies', 'Movies'], ['/admin/theatres', 'Theatres'], ['/admin/shows', 'Shows']].map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `btn ${isActive ? 'im-btn' : 'btn-outline-light'}`}>{label}</NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
