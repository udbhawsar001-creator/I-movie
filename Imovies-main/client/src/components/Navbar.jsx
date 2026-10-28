import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { markAllRead } from '../store/notifSlice';

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const { items, unread } = useSelector((s) => s.notif);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const toggleBell = () => {
    if (!open && unread) dispatch(markAllRead());
    setOpen(!open);
  };

  return (
    <nav className="navbar navbar-dark im-nav">
      <div className="container">
        <Link className="navbar-brand im-brand" to="/">IMovies</Link>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <NavLink className="nav-link px-2" to="/">Movies</NavLink>
          {user ? (
            <>
              <NavLink className="nav-link px-2" to="/bookings">My bookings</NavLink>
              {user.role === 'admin' && <NavLink className="nav-link px-2" to="/admin">Admin</NavLink>}
              <div className="position-relative">
                <button className="btn btn-sm btn-outline-light position-relative" onClick={toggleBell} aria-label="Notifications" aria-expanded={open}>
                  Alerts{unread > 0 && <span className="badge rounded-pill im-badge ms-1">{unread}</span>}
                </button>
                {open && (
                  <div className="im-dropdown">
                    {!items.length && <div className="text-secondary small p-3">No notifications yet.</div>}
                    {items.map((n) => (
                      <div key={n._id} className="im-note">
                        <div className="small">{n.message}</div>
                        <div className="text-secondary" style={{ fontSize: '.7rem' }}>{new Date(n.createdAt).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-secondary small d-none d-md-inline">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn btn-sm btn-outline-light" onClick={() => { dispatch(logout()); setOpen(false); navigate('/'); }}>Log out</button>
            </>
          ) : (
            <>
              <NavLink className="nav-link px-2" to="/login">Log in</NavLink>
              <Link className="btn btn-sm im-btn" to="/register">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
