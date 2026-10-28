// Integration tests. Start the API first (npm run dev) on a freshly seeded DB (npm run seed).
//   BASE=http://localhost:5000/api npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.BASE || 'http://localhost:5000/api';
const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const login = async (email, password) => (await call('/auth/login', { method: 'POST', body: { email, password } })).data.token;

const stamp = Date.now();
const state = {};

test('auth: register validates input', async () => {
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'A' } })).status, 400);
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Test', email: 'bad', password: '123456' } })).status, 400);
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Test', email: `t${stamp}@x.com`, password: '123' } })).status, 400);
});

test('auth: register, duplicate, login, me', async () => {
  const email = `t${stamp}@x.com`;
  const reg = await call('/auth/register', { method: 'POST', body: { name: 'Tester', email, password: 'secret1' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.role, 'user');
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Tester', email, password: 'secret1' } })).status, 409);
  assert.equal((await call('/auth/login', { method: 'POST', body: { email, password: 'wrong' } })).status, 401);
  state.token = await login(email, 'secret1');
  assert.equal((await call('/auth/me', { token: state.token })).data.user.email, email);
});

test('security: protected + admin routes', async () => {
  assert.equal((await call('/bookings/my')).status, 401);
  assert.equal((await call('/admin/stats', { token: state.token })).status, 403);
  state.admin = await login('admin@imovies.com', 'admin123');
  assert.equal((await call('/admin/stats', { token: state.admin })).status, 200);
});

test('movies: pagination, search, filters', async () => {
  const p1 = await call('/movies?limit=3&page=1');
  assert.equal(p1.data.data.length, 3);
  assert.ok(p1.data.pages >= 2);
  const s = await call('/movies?q=orbit');
  assert.equal(s.data.data[0].title, 'Orbit Seven');
  const g = await call('/movies?genre=Comedy');
  assert.ok(g.data.data.every((m) => m.genre === 'Comedy'));
  const city = await call('/movies?city=Indore');
  assert.ok(city.data.total > 0);
  assert.equal((await call('/movies?date=nope')).status, 400);
  state.movie = p1.data.data[0];
});

test('movies: admin CRUD', async () => {
  assert.equal((await call('/admin/movies', { method: 'POST', token: state.admin, body: { title: 'X' } })).status, 400);
  const c = await call('/admin/movies', { method: 'POST', token: state.admin, body: { title: `Temp ${stamp}`, genre: 'Drama', language: 'English', duration: 100 } });
  assert.equal(c.status, 201);
  const u = await call(`/admin/movies/${c.data._id}`, { method: 'PUT', token: state.admin, body: { rating: 9 } });
  assert.equal(u.data.rating, 9);
  assert.equal((await call(`/admin/movies/${c.data._id}`, { method: 'DELETE', token: state.admin })).status, 200);
  assert.equal((await call(`/movies/${c.data._id}`)).status, 404);
});

test('booking: hold, double-hold conflict, bad payment, good payment, cancel', async () => {
  const shows = (await call(`/shows/movie/${state.movie._id}`)).data;
  assert.ok(shows.length > 0, 'seed data needed');
  const show = shows[0];

  const hold = await call('/bookings', { method: 'POST', token: state.token, body: { showId: show._id, seats: ['A1', 'A2'] } });
  assert.equal(hold.status, 201);
  assert.equal(hold.data.status, 'pending');
  assert.equal(hold.data.totalAmount, 2 * show.price);

  // a second user cannot take the same seat
  const email2 = `u2${stamp}@x.com`;
  const t2 = (await call('/auth/register', { method: 'POST', body: { name: 'Second', email: email2, password: 'secret1' } })).data.token;
  const clash = await call('/bookings', { method: 'POST', token: t2, body: { showId: show._id, seats: ['A2', 'A3'] } });
  assert.equal(clash.status, 409);
  const seatMap = (await call(`/shows/${show._id}/seats`, { token: state.token })).data;
  assert.equal(seatMap.find((s) => s.label === 'A3').status, 'available', 'partial hold rolled back');

  assert.equal((await call('/bookings', { method: 'POST', token: state.token, body: { showId: show._id, seats: ['Z99'] } })).status, 400);
  assert.equal((await call('/bookings', { method: 'POST', token: state.token, body: { showId: show._id, seats: [] } })).status, 400);

  const bad = await call('/payments', { method: 'POST', token: state.token, body: { bookingId: hold.data._id, method: 'card', cardNumber: '4000000000000000' } });
  assert.equal(bad.status, 402);
  const invalid = await call('/payments', { method: 'POST', token: state.token, body: { bookingId: hold.data._id, method: 'card', cardNumber: '12' } });
  assert.equal(invalid.status, 400);

  const ok = await call('/payments', { method: 'POST', token: state.token, body: { bookingId: hold.data._id, method: 'card', cardNumber: '4111111111111111' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.booking.status, 'confirmed');
  assert.equal((await call('/payments', { method: 'POST', token: state.token, body: { bookingId: hold.data._id, method: 'wallet' } })).status, 400, 'no double pay');

  const mine = await call('/bookings/my?type=upcoming', { token: state.token });
  assert.ok(mine.data.data.some((b) => b._id === hold.data._id));

  const cancel = await call(`/bookings/${hold.data._id}/cancel`, { method: 'PATCH', token: state.token });
  assert.equal(cancel.data.status, 'cancelled');
  const after = (await call(`/shows/${show._id}/seats`)).data;
  assert.equal(after.find((s) => s.label === 'A1').status, 'available');
  assert.equal((await call(`/bookings/${hold.data._id}/cancel`, { method: 'PATCH', token: state.token })).status, 400);

  const notes = await call('/notifications', { token: state.token });
  assert.ok(notes.data.items.length >= 2);
});
