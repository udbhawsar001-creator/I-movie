import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login, register } from '../store/authSlice';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const action = isRegister ? register(form) : login({ email: form.email, password: form.password });
    const res = await dispatch(action);
    setBusy(false);
    if (res.error) return toast.error(res.payload || 'Something went wrong');
    navigate(location.state?.from || '/', { replace: true });
  };

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h1 className="h3 mb-4">{isRegister ? 'Create your account' : 'Log in'}</h1>
      <form onSubmit={submit} noValidate>
        {isRegister && (
          <div className="mb-3">
            <label className="form-label" htmlFor="name">Name</label>
            <input id="name" className="form-control im-input" value={form.name} onChange={set('name')} autoComplete="name" required />
          </div>
        )}
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="form-control im-input" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="form-control im-input" value={form.password} onChange={set('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} required />
          {isRegister && <div className="form-text">At least 6 characters.</div>}
        </div>
        <button className="btn im-btn w-100" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</button>
      </form>
      <p className="mt-3 text-secondary small">
        {isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
      </p>
    </div>
  );
}
