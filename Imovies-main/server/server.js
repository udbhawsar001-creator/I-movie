require('dotenv').config();
const http = require('http');
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const app = require('./app');
const { init } = require('./socket');
const { cleanupExpired } = require('./services/seatService');

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error('Set MONGO_URI and JWT_SECRET in server/.env');
  process.exit(1);
}

const server = http.createServer(app);
init(server, process.env.CLIENT_URL || 'http://localhost:5173');

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => logger.info(`API running on http://localhost:${PORT}`));
  // free seats whose payment window ran out
  setInterval(() => cleanupExpired().catch((e) => logger.error('cleanup failed: ' + e.message)), 30 * 1000);
});

process.on('unhandledRejection', (e) => logger.error('unhandledRejection: ' + (e && e.stack ? e.stack : e)));
