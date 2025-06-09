
const jwt = require('jsonwebtoken');

function extractUserId(token) {
  try {
    const payload = jwt.decode(token);
    return payload.username || payload.id || payload.user || 'unknown';
  } catch {
    return 'unknown';
  }
}

module.exports = { extractUserId };