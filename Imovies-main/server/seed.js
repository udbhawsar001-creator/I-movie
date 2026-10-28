require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Movie = require('./models/Movie');
const Theatre = require('./models/Theatre');
const Show = require('./models/Show');
const Seat = require('./models/Seat');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const { makeSeatDocs } = require('./utils/validate');

const movies = [
  { title: 'Midnight Express Run', genre: 'Action', language: 'English', duration: 128, rating: 7.8, description: 'A retired courier takes one last overnight job across a city that wants him stopped.' },
  { title: 'The Last Monsoon', genre: 'Drama', language: 'Hindi', duration: 141, rating: 8.3, description: 'Three generations of a farming family face the season that decides everything.' },
  { title: 'Orbit Seven', genre: 'Sci-Fi', language: 'English', duration: 119, rating: 7.4, description: 'A crew on a failing station has seven orbits left to fix the one thing they cannot reach.' },
  { title: 'Chai & Chaos', genre: 'Comedy', language: 'Hindi', duration: 112, rating: 7.1, description: 'A tea stall, two rival cousins and one wedding that refuses to go to plan.' },
  { title: 'Hollow Pines', genre: 'Thriller', language: 'English', duration: 105, rating: 7.6, description: 'A weekend cabin trip turns when the neighbours turn out to know too much.' },
  { title: 'Paper Lanterns', genre: 'Romance', language: 'English', duration: 124, rating: 7.9, description: 'Two strangers keep swapping letters in a library book across one long winter.' },
  { title: 'Iron Veil', genre: 'Action', language: 'Hindi', duration: 136, rating: 7.2, description: 'A masked vigilante and a tired cop chase the same shadow across one night.' },
  { title: 'Little Harbour', genre: 'Drama', language: 'English', duration: 98, rating: 8.0, description: 'A fishing town argues over whether to sell its last pier.' },
];

const theatres = [
  { name: 'Galaxy Cinemas', city: 'Jabalpur', address: 'Napier Town', screens: [{ name: 'Screen 1', rows: 8, seatsPerRow: 10 }, { name: 'Screen 2', rows: 6, seatsPerRow: 8 }] },
  { name: 'Silver Screen', city: 'Indore', address: 'Vijay Nagar', screens: [{ name: 'Screen 1', rows: 8, seatsPerRow: 10 }, { name: 'Screen 2', rows: 8, seatsPerRow: 12 }] },
  { name: 'Royal Plaza', city: 'Bhopal', address: 'MP Nagar', screens: [{ name: 'Screen 1', rows: 7, seatsPerRow: 10 }, { name: 'Screen 2', rows: 6, seatsPerRow: 10 }] },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Movie, Theatre, Show, Seat, Booking, Payment, Notification].map((m) => m.deleteMany({})));

  await User.create([
    { name: 'Admin', email: 'admin@imovies.com', password: 'admin123', role: 'admin' },
    { name: 'Demo User', email: 'user@imovies.com', password: 'user123', role: 'user' },
  ]);
  const mv = await Movie.insertMany(movies);
  const th = await Theatre.insertMany(theatres);

  // 4 slots/day per screen, 3.5h apart: no overlaps
  const slots = [[10, 30], [14, 0], [17, 30], [21, 0]];
  const shows = [];
  th.forEach((t, ti) => {
    t.screens.forEach((sc, si) => {
      for (let d = 0; d < 5; d++) {
        slots.forEach(([h, m], k) => {
          const start = new Date();
          start.setDate(start.getDate() + d);
          start.setHours(h, m, 0, 0);
          if (start <= new Date()) return;
          const movie = mv[(d + ti * 2 + si * 3 + k) % mv.length];
          shows.push({ movie: movie._id, theatre: t._id, screen: sc.name, startTime: start, price: k >= 2 ? 250 : 180, rows: sc.rows, seatsPerRow: sc.seatsPerRow });
        });
      }
    });
  });
  const created = await Show.insertMany(shows);
  await Seat.insertMany(created.flatMap((s) => makeSeatDocs(s._id, s.rows, s.seatsPerRow)), { ordered: false });

  console.log(`Seeded ${mv.length} movies, ${th.length} theatres, ${created.length} shows`);
  console.log('Admin: admin@imovies.com / admin123   User: user@imovies.com / user123');
  await mongoose.disconnect();
})();
