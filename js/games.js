// @ts-check

import { turso } from './turso-client.js';
import {
  allGames,
  consoles,
  currentPage,
  currentUser,
  isLoggedIn,
  canReview,
  canVote,
  itemsPerPage,
  setAllGames,
  setConsoles,
  setCurrentPage,
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
  paginationContainer,
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
        g.cover_url,
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
      cover_url: row.cover_url ? String(row.cover_url) : undefined,
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  if (validPage !== currentPage) {
    setCurrentPage(validPage);
  }

  const start = (validPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);

  if (countEl) {
    const countText = filtered.length > 0
      ? `${filtered.length} juego${filtered.length !== 1 ? 's' : ''} (pág. ${validPage} de ${totalPages})`
      : '0 juegos';
    countEl.textContent = countText;
  }

  renderGames(paginated, filtered.length, totalPages);
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
export function renderGames(games, totalCount, totalPages) {
  if (!grid) return;

  if (games.length === 0) {
    grid.innerHTML = '<div class="empty-state">No se encontraron juegos con esos filtros.</div>';
    if (paginationContainer) paginationContainer.innerHTML = '';
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

  renderPagination(totalCount, totalPages);
}

/**
 * Refresh the visible game list without reloading from the server.
 */
export function refreshGamesUI() {
  applyFilters();
}

/**
 * Navigate to a specific page and re-render.
 * @param {number} page
 */
export function goToPage(page) {
  setCurrentPage(page);
  applyFilters();
  window.scrollTo(0, 0);
}

/**
 * Render pagination controls.
 * @param {number} totalCount
 * @param {number} totalPages
 */
function renderPagination(totalCount, totalPages) {
  if (!paginationContainer) return;
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  const pages = [];
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push(null);
  }
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push(null);
    pages.push(totalPages);
  }

  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';

  let html = '<div class="pagination">';
  html += `<button type="button" class="btn btn-secondary" ${prevDisabled} onclick="window.goToPage(${currentPage - 1})">Anterior</button>`;
  html += '<div class="pagination-pages">';
  for (const p of pages) {
    if (p === null) {
      html += '<span class="pagination-ellipsis">…</span>';
    } else if (p === currentPage) {
      html += `<button type="button" class="btn btn-primary active" disabled>${p}</button>`;
    } else {
      html += `<button type="button" class="btn btn-secondary" onclick="window.goToPage(${p})">${p}</button>`;
    }
  }
  html += '</div>';
  html += `<button type="button" class="btn btn-secondary" ${nextDisabled} onclick="window.goToPage(${currentPage + 1})">Siguiente</button>`;
  html += '</div>';

  paginationContainer.innerHTML = html;
}
