import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, admin = false }) {
  const { user, loading } = useSelector((s) => s.auth);
  const location = useLocation();
  if (loading) return <div className="container py-5 text-secondary">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== 'admin') return <div className="container py-5"><div className="alert alert-danger">Admins only.</div></div>;
  return children;
}
