// @ts-check

/**
 * @typedef {'admin'|'user'|'guest'} UserRole
 */

/**
 * Escape HTML special characters.
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render a 5-star string from a 1-10 score.
 * @param {number} score
 * @returns {string}
 */
export function renderStars(score) {
  const full = Math.floor(score / 2);
  const half = score % 2 >= 1 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

/**
 * Hash a password with SHA-256.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Human-readable role label.
 * @param {UserRole|string} role
 * @returns {string}
 */
export function roleLabel(role) {
  const labels = { admin: 'Admin', user: 'Usuario', guest: 'Invitado' };
  return labels[role] || role;
}

/**
 * Simple pluralization helper.
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string}
 */
export function pluralize(count, singular, plural = singular + 's') {
  return count === 1 ? singular : plural;
}

/**
 * Check whether a Turso error is a unique constraint failure.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isUniqueConstraintError(err) {
  const msg = (err instanceof Error ? err.message : '').toLowerCase();
  return msg.includes('unique constraint failed');
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
