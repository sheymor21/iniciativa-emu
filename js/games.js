// @ts-check

import { turso } from './turso-client.js';
import {
  allGames,
  consoles,
  currentUser,
  isLoggedIn,
  canReview,
  canVote,
  setAllGames,
  setConsoles,
  showOnlyFavorites,
  showOnlyPlayed,
  userFavorites,
  userPlayOrder,
  userPlayedGames,
} from './state.js';
import {
  countEl,
  filterConsole,
  filterName,
  filterRank,
  filterReviews,
  grid,
  sortBy,
} from './elements.js';
import { escapeHtml } from './utils.js';
import { gameCard } from './templates.js';
import { updateTabCounts } from './tab-counts.js';

/**
 * @typedef {import('./state.js').Game} Game
 */

/**
 * Load games from Turso, build the local cache, and render.
 */
export async function loadGames() {
  if (!grid || !countEl) return;

  grid.innerHTML = '<div class="loading">Cargando juegos...</div>';
  countEl.textContent = 'Cargando...';

  try {
    const { rows } = await turso.execute(`
      SELECT
        g.id,
        g.name,
        g.console,
        g.genre,
        COALESCE(AVG(r.score), 0) AS avg_score,
        COUNT(DISTINCT r.id) AS rating_count,
        COALESCE(GROUP_CONCAT(r.author || ': ' || r.score, ' | '), '') AS rating_votes,
        COUNT(DISTINCT rv.id) AS review_count
      FROM games g
      LEFT JOIN ratings r ON r.game_id = g.id
      LEFT JOIN reviews rv ON rv.game_id = g.id
      GROUP BY g.id, g.name, g.console, g.genre
      ORDER BY g.console, g.name
    `);

    /** @type {Game[]} */
    const games = rows.map(row => ({
      id: Number(row.id),
      name: String(row.name),
      console: String(row.console),
      genre: String(row.genre),
      avgScore: Math.round(Number(row.avg_score) * 10) / 10,
      ratingCount: Number(row.rating_count),
      ratingVotes: String(row.rating_votes),
      reviewCount: Number(row.review_count),
    }));

    setAllGames(games);
    setConsoles([...new Set(games.map(g => g.console))].sort());
    populateConsoleFilter();
    applyFilters();
    updateTabCounts();
  } catch (err) {
    grid.innerHTML = `<div class="error">
      <strong>Error cargando juegos:</strong><br>
      ${escapeHtml(err instanceof Error ? err.message : String(err))}<br><br>
      Revisa que <code>js/config.js</code> tenga la URL completa de Turso (empieza con <code>https://</code>) y un token válido.
    </div>`;
    countEl.textContent = 'Error';
  }
}

/**
 * Repopulate the console filter dropdown while preserving the current selection.
 */
export function populateConsoleFilter() {
  if (!filterConsole) return;

  const current = filterConsole.value;
  filterConsole.innerHTML = '<option value="">Todas</option>';

  for (const c of consoles) {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    filterConsole.appendChild(option);
  }

  filterConsole.value = current;
}

/**
 * Apply current filters and sorting, then render the grid.
 */
export function applyFilters() {
  const nameQuery = filterName?.value.trim().toLowerCase() || '';
  const consoleValue = filterConsole?.value || '';
  const rankValue = filterRank?.value || '';
  const reviewsValue = filterReviews?.value || '';
  const sortValue = sortBy?.value || '';

  const filtered = allGames.filter(game => {
    if (nameQuery && !game.name.toLowerCase().includes(nameQuery)) return false;
    if (consoleValue && game.console !== consoleValue) return false;

    if (rankValue === 'rated' && game.ratingCount === 0) return false;
    if (rankValue === 'unrated' && game.ratingCount > 0) return false;
    if (rankValue === '9+' && game.avgScore < 9) return false;
    if (rankValue === '7+' && game.avgScore < 7) return false;
    if (rankValue === '5+' && game.avgScore < 5) return false;

    if (reviewsValue === 'with' && game.reviewCount === 0) return false;
    if (reviewsValue === 'without' && game.reviewCount > 0) return false;

    if (showOnlyFavorites && !userFavorites.has(game.id)) return false;
    if (showOnlyPlayed && !userPlayedGames.has(game.id)) return false;

    return true;
  });

  filtered.sort((a, b) => sortGames(a, b, sortValue));

  if (countEl) {
    countEl.textContent = `${filtered.length} juego${filtered.length !== 1 ? 's' : ''}`;
  }

  renderGames(filtered);
}

/**
 * Sort comparator for games.
 * @param {Game} a
 * @param {Game} b
 * @param {string} sortValue
 * @returns {number}
 */
function sortGames(a, b, sortValue) {
  switch (sortValue) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'console':
      return a.console.localeCompare(b.console) || a.name.localeCompare(b.name);
    case 'rank-desc':
      return b.avgScore - a.avgScore || a.name.localeCompare(b.name);
    case 'rank-asc':
      return a.avgScore - b.avgScore || a.name.localeCompare(b.name);
    case 'reviews-desc':
      return b.reviewCount - a.reviewCount || a.name.localeCompare(b.name);
    case 'play-order': {
      const idxA = userPlayOrder.indexOf(a.id);
      const idxB = userPlayOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }
    default:
      return 0;
  }
}

/**
 * Render the given games into the grid.
 * @param {Game[]} games
 */
export function renderGames(games) {
  if (!grid) return;

  if (games.length === 0) {
    grid.innerHTML = '<div class="empty-state">No se encontraron juegos con esos filtros.</div>';
    return;
  }

  grid.innerHTML = '';

  const authorName = escapeHtml(currentUser?.display_name || '');
  const authorReadonly = currentUser ? 'readonly' : '';

  for (const game of games) {
    const card = document.createElement('article');
    card.className = 'game-card';
    card.dataset.id = String(game.id);

    card.innerHTML = gameCard(
      game,
      {
        isLoggedIn: isLoggedIn(),
        isFavorite: userFavorites.has(game.id),
        isPlayed: userPlayedGames.has(game.id),
        inPlayOrder: userPlayOrder.includes(game.id),
        showPlayOrderButton: isLoggedIn() && showOnlyFavorites,
        canVote: canVote(),
        canReview: canReview(),
      },
      authorName,
      authorReadonly,
    );

    grid.appendChild(card);
  }
}

/**
 * Refresh the visible game list without reloading from the server.
 */
export function refreshGamesUI() {
  applyFilters();
}
