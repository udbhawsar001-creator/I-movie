# IMovies - Cinema Booking & Management System (MERN)

Browse movies, filter by genre/language/city/theatre/date, pick a show, choose seats on a live seat map,
pay, manage bookings. Admins manage movies, theatres and shows.

## Stack
- **Frontend:** React (Vite), Redux Toolkit, React Router, Axios, React-Toastify, Bootstrap 5, socket.io-client
- **Backend:** Node, Express, MongoDB (Mongoose), JWT, bcryptjs, Multer, Socket.IO, express-rate-limit, helmet, morgan

## Run
Needs Node 16+ and MongoDB running locally.
```bash
cd server && npm install
cp .env.example .env          # set JWT_SECRET
npm run seed                  # movies, theatres, shows, seats, 2 users
npm run dev                   # API on :5000

cd client && npm install
npm run dev                   # app on :5173
```
Seed logins: `admin@imovies.com / admin123` and `user@imovies.com / user123`.

## How booking works (important for viva)
1. **Hold**: `POST /api/bookings` claims the chosen seats with ONE atomic `updateMany`
   (only seats that are `available` or whose old hold expired). If fewer seats were claimed than
   requested, the partial claim is rolled back and the API returns 409. This is what prevents double booking.
2. **Pay**: seats stay held for 5 minutes. `POST /api/payments` runs a mock gateway.
   Failed payment keeps the hold so the user can retry.
3. **Confirm**: on success seats become `booked`. If the hold was lost mid-payment the payment is refunded.
4. **Expiry**: a 30s sweeper frees seats of unpaid bookings. **Cancel** frees seats and records a refund.
5. **Real time**: every seat change emits `seats:changed` on Socket.IO; open seat maps refetch instantly.
   Users also get live `notify` events (toast + bell).

Mock payment: card `4111111111111111` succeeds, number ending `0000` is declined. UPI `name@bank` succeeds, `@fail` is declined. Wallet always succeeds.

## Collections
Users, Movies, Theatres (with screens), Shows, Seats (one doc per seat per show), Bookings, Payments, Notifications.

## Security
bcrypt password hashing, JWT (7d), `protect` + `restrictTo('admin')` middleware, roles `user`/`admin`
(register can never create admins), helmet, CORS, rate limits (global, auth, booking), server-side validation,
poster upload limited to PNG/JPG/WEBP under 2 MB.

## Performance
Indexes on movie search/filter, show lookup (movie+time, theatre+screen+time), seats (show+label unique, show+status),
booking history (user+createdAt), expiry sweeper. Pagination on movies, my bookings, admin lists.
Central error handler + file/console logger (`server/logs/app.log`).

## API (prefix `/api`)
| Method | Route | Auth |
|---|---|---|
| POST | /auth/register, /auth/login | - |
| GET | /auth/me | user |
| GET | /movies?q&genre&language&city&theatre&date&page&limit | - |
| GET | /movies/filters, /movies/:id, /theatres | - |
| GET | /shows/movie/:movieId, /shows/:id, /shows/:id/seats | - |
| POST | /bookings (hold seats) | user |
| GET | /bookings/my?type=upcoming\|past&page, /bookings/:id | user |
| PATCH | /bookings/:id/cancel | user |
| POST | /payments | user |
| GET/PATCH | /notifications, /notifications/read | user |
| GET | /admin/stats | admin |
| CRUD | /admin/movies (multipart poster), /admin/theatres, /admin/shows | admin |

## Testing
- Postman: import `server/tests/imovies.postman_collection.json`
- Automated: start API on a freshly seeded DB, then `cd server && npm test`
  (covers auth, roles, validation, filters, pagination, movie CRUD, seat hold conflict, payment fail/success, cancel, notifications)
- Manual UI checklist: register/login, filter movies, open one seat map in two browsers and watch seats update live,
  pay with a declined card then a good one, cancel a booking, use admin panel to add a movie, theatre and show.

## Deploy
Build client (`npm run build`), set `NODE_ENV=production` on the server: Express then serves `client/dist`.
Use MongoDB Atlas for `MONGO_URI`.
