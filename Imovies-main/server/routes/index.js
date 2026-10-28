const router = require('express').Router();
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { authLimiter, bookingLimiter } = require('../middleware/rateLimit');
const upload = require('../middleware/upload');

const auth = require('../controllers/authController');
const movies = require('../controllers/movieController');
const theatres = require('../controllers/theatreController');
const shows = require('../controllers/showController');
const bookings = require('../controllers/bookingController');
const payments = require('../controllers/paymentController');
const notifications = require('../controllers/notificationController');
const admin = require('../controllers/adminController');

// public
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/me', protect, auth.me);

router.get('/movies', movies.list);
router.get('/movies/filters', movies.filters); // before /:id
router.get('/movies/:id', movies.getOne);
router.get('/theatres', theatres.list);
router.get('/shows/movie/:movieId', shows.byMovie);
router.get('/shows/:id', shows.getOne);
router.get('/shows/:id/seats', optionalAuth, shows.seats);

// logged-in users
router.post('/bookings', protect, bookingLimiter, bookings.create);
router.get('/bookings/my', protect, bookings.mine); // before /:id
router.get('/bookings/:id', protect, bookings.getOne);
router.patch('/bookings/:id/cancel', protect, bookings.cancel);
router.post('/payments', protect, bookingLimiter, payments.pay);
router.get('/notifications', protect, notifications.list);
router.patch('/notifications/read', protect, notifications.markAllRead);

// admin only
const adminRouter = require('express').Router();
adminRouter.use(protect, restrictTo('admin'));
adminRouter.get('/stats', admin.stats);
adminRouter.get('/movies', movies.adminList);
adminRouter.post('/movies', upload.single('poster'), movies.create);
adminRouter.put('/movies/:id', upload.single('poster'), movies.update);
adminRouter.delete('/movies/:id', movies.remove);
adminRouter.post('/theatres', theatres.create);
adminRouter.put('/theatres/:id', theatres.update);
adminRouter.delete('/theatres/:id', theatres.remove);
adminRouter.get('/shows', shows.adminList);
adminRouter.post('/shows', shows.create);
adminRouter.put('/shows/:id', shows.update);
adminRouter.delete('/shows/:id', shows.remove);
router.use('/admin', adminRouter);

module.exports = router;
