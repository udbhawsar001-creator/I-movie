const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'logs');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'app.log');

const write = (level, msg, meta) => {
  const line = `${new Date().toISOString()} [${level}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  (level === 'error' ? console.error : console.log)(line);
  fs.appendFile(file, line + '\n', () => {});
};

module.exports = {
  info: (m, x) => write('info', m, x),
  warn: (m, x) => write('warn', m, x),
  error: (m, x) => write('error', m, x),
  stream: { write: (m) => write('http', m.trim()) }, // morgan target
};
