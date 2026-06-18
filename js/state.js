// @ts-check

/**
 * @typedef {object} User
 * @property {number} id
 * @property {string} username
 * @property {string} display_name
 * @property {'admin'|'user'|'guest'} role
 */

/**
 * @typedef {object} Game
 * @property {number} id
 * @property {string} name
 * @property {string} console
 * @property {string} genre
 * @property {string} [cover_url]
 * @property {number} avgScore
 * @property {number} ratingCount
 * @property {string} ratingVotes
 * @property {number} reviewCount
 */

/**
 * @typedef {object} UserRow
 * @property {number|string} id
 * @property {string} username
 * @property {string} display_name
 * @property {'admin'|'user'|'guest'} role
 */

/** @type {Game[]} */
export let allGames = [];

/** @type {string[]} */
export let consoles = [];

/** @type {UserRow[]} */
export let allUsers = [];

/** @type {User|null} */
export let currentUser = null;

/** @type {Set<number>} */
export const userFavorites = new Set();

/** @type {number[]} */
export let userPlayOrder = [];

/** @type {Set<number>} */
export const userPlayedGames = new Set();

/** @type {boolean} */
export let showOnlyFavorites = false;

/** @type {boolean} */
export let showOnlyPlayed = false;

/** @type {number} */
export let currentPage = 1;

/** @type {number} */
export const itemsPerPage = 24;

/** @type {Set<number>} */
export const processingFavorites = new Set();

/** @type {Set<number>} */
export const processingPlayOrder = new Set();

/** @type {Set<number>} */
export const processingPlayed = new Set();

/** @type {number|null} */
export let draggedPlayOrderId = null;

/**
 * Replace the allGames array.
 * @param {Game[]} games
 */
export function setAllGames(games) {
  allGames = games;
}

/**
 * Replace the consoles array.
 * @param {string[]} consoleList
 */
export function setConsoles(consoleList) {
  consoles = consoleList;
}

/**
 * Replace the allUsers array.
 * @param {UserRow[]} users
 */
export function setAllUsers(users) {
  allUsers = users;
}

/**
 * Replace the current user.
 * @param {User|null} user
 */
export function setCurrentUser(user) {
  currentUser = user;
}

/**
 * Replace the play order array.
 * @param {number[]} order
 */
export function setUserPlayOrder(order) {
  userPlayOrder = order;
}

/**
 * Toggle the favorites filter flag.
 * @param {boolean} value
 */
export function setShowOnlyFavorites(value) {
  showOnlyFavorites = value;
}

/**
 * Toggle the played filter flag.
 * @param {boolean} value
 */
export function setShowOnlyPlayed(value) {
  showOnlyPlayed = value;
}

/**
 * Set the dragged play order id.
 * @param {number|null} id
 */
export function setDraggedPlayOrderId(id) {
  draggedPlayOrderId = id;
}

/**
 * Set the current page.
 * @param {number} page
 */
export function setCurrentPage(page) {
  currentPage = page;
}

export function loadCurrentUser() {
  try {
    const saved = sessionStorage.getItem('currentUser');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id != null) {
        parsed.id = Number(parsed.id);
      }
      currentUser = parsed;
    }
  } catch {
    currentUser = null;
  }
}

export function saveCurrentUser() {
  sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
}

export function clearCurrentUser() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
}

export function isAdmin() { return currentUser?.role === 'admin'; }
export function isUser() { return currentUser?.role === 'user'; }
export function canVote() { return isAdmin() || isUser(); }
export function canReview() { return isAdmin() || isUser(); }
export function isLoggedIn() { return !!currentUser && currentUser.role !== 'guest'; }
