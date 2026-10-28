const crypto = require('crypto');

// Mock gateway. No real money moves.
//  card:   16 digits. ends with 0000 -> declined. else success (try 4111111111111111)
//  upi:    name@bank. ends with @fail -> declined.
//  wallet: always success
exports.charge = async ({ method, details = {} }) => {
  await new Promise((r) => setTimeout(r, 400)); // fake network delay
  const txn = 'TXN' + crypto.randomBytes(6).toString('hex').toUpperCase();

  if (method === 'card') {
    const n = String(details.cardNumber || '').replace(/\s/g, '');
    if (!/^\d{16}$/.test(n)) return { ok: false, invalid: true, reason: 'Enter a valid 16-digit card number' };
    if (n.endsWith('0000')) return { ok: false, txn, reason: 'Card declined by bank' };
  } else if (method === 'upi') {
    const id = String(details.upiId || '');
    if (!/^[\w.-]+@\w+$/.test(id)) return { ok: false, invalid: true, reason: 'Enter a valid UPI ID like name@bank' };
    if (id.endsWith('@fail')) return { ok: false, txn, reason: 'UPI payment failed' };
  } else if (method !== 'wallet') {
    return { ok: false, invalid: true, reason: 'Unsupported payment method' };
  }
  return { ok: true, txn };
};
