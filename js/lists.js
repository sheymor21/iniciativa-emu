// @ts-check

import { turso } from './turso-client.js';
import {
  allGames,
  currentUser,
  isLoggedIn,
  processingFavorites,
  processingPlayOrder,
  processingPlayed,
  setDraggedPlayOrderId,
  setUserPlayOrder,
  showOnlyFavorites,
  showOnlyPlayed,
  userFavorites,
  userPlayOrder,
  userPlayedGames,
} from './state.js';
import {
  favoritesBtn,
  grid,
  playOrderListEl,
  playOrderModal,
  playedBtn,
} from './elements.js';
import { isUniqueConstraintError } from './utils.js';
import { playOrderItem } from './templates.js';
import { applyFilters } from './games.js';
import { setShowOnlyFavorites, setShowOnlyPlayed } from './state.js';

/**
 * Load favorites, play order, and played games for the current user.
 */
export async function loadUserLists() {
  userFavorites.clear();
  setUserPlayOrder([]);
  userPlayedGames.clear();

  if (!isLoggedIn() || !currentUser) return;

  try {
    const userId = Number(currentUser.id);
    const [favResult, orderResult, playedResult] = await Promise.all([
      turso.execute('SELECT game_id FROM favorites WHERE user_id = ?', [userId]),
      turso.execute('SELECT game_id FROM play_orders WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC', [userId]),
      turso.execute('SELECT game_id FROM played_games WHERE user_id = ?', [userId]),
    ]);

    favResult.rows.forEach(r => userFavorites.add(Number(r.game_id)));
    setUserPlayOrder(orderResult.rows.map(r => Number(r.game_id)));
    playedResult.rows.forEach(r => userPlayedGames.add(Number(r.game_id)));
  } catch (err) {
    console.error('Error loading user lists:', err);
  }
}

/**
 * Generic toggle helper for boolean user lists (favorites, played).
 * @template {number} T
 * @param {number} gameId
 * @param {object} opts
 * @param {Set<number>} opts.localSet
 * @param {Set<number>} opts.processingSet
 * @param {string} opts.insertSql
 * @param {string} opts.deleteSql
 * @param {unknown[]} opts.insertArgs
 * @param {unknown[]} opts.deleteArgs
 * @param {(id: number) => void} opts.updateButton
 * @param {string} opts.errorLabel
 */
async function toggleUserListItem(gameId, opts) {
  if (!isLoggedIn() || !currentUser) return;

  gameId = Number(gameId);

  if (opts.processingSet.has(gameId)) return;
  opts.processingSet.add(gameId);

  const isActive = opts.localSet.has(gameId);

  try {
    if (isActive) {
      await turso.execute(opts.deleteSql, opts.deleteArgs);
      opts.localSet.delete(gameId);
    } else {
      await turso.execute(opts.insertSql, opts.insertArgs);
      opts.localSet.add(gameId);
    }

    opts.updateButton(gameId);
    refreshListsUI();
  } catch (err) {
    if (!isActive && isUniqueConstraintError(err)) {
      opts.localSet.add(gameId);
      opts.updateButton(gameId);
      refreshListsUI();
    } else {
      alert(`${opts.errorLabel}: ${err instanceof Error ? err.message : String(err)}`);
    }
  } finally {
    opts.processingSet.delete(gameId);
  }
}

/**
 * Toggle favorite status for a game.
 * @param {number} gameId
 */
export function toggleFavorite(gameId) {
  if (!isLoggedIn()) {
    alert('Inicia sesión para guardar favoritos.');
    return;
  }

  toggleUserListItem(gameId, {
    localSet: userFavorites,
    processingSet: processingFavorites,
    insertSql: 'INSERT INTO favorites (user_id, game_id) VALUES (?, ?)',
    deleteSql: 'DELETE FROM favorites WHERE user_id = ? AND game_id = ?',
    insertArgs: [currentUser.id, Number(gameId)],
    deleteArgs: [currentUser.id, Number(gameId)],
    updateButton: updateFavoriteButton,
    errorLabel: 'Error al actualizar favoritos',
  });
}

/**
 * Toggle played status for a game.
 * @param {number} gameId
 */
export function togglePlayed(gameId) {
  if (!isLoggedIn()) {
    alert('Inicia sesión para marcar juegos como jugados.');
    return;
  }

  toggleUserListItem(gameId, {
    localSet: userPlayedGames,
    processingSet: processingPlayed,
    insertSql: 'INSERT INTO played_games (user_id, game_id) VALUES (?, ?)',
    deleteSql: 'DELETE FROM played_games WHERE user_id = ? AND game_id = ?',
    insertArgs: [currentUser.id, Number(gameId)],
    deleteArgs: [currentUser.id, Number(gameId)],
    updateButton: updatePlayedButton,
    errorLabel: 'Error al actualizar juegos jugados',
  });
}

/**
 * Update the played button on a game card.
 * @param {number} gameId
 */
export function updatePlayedButton(gameId) {
  const card = grid?.querySelector(`.game-card[data-id="${gameId}"]`);
  if (!card) return;

  const btn = card.querySelector('.played-btn');
  if (!btn) return;

  const isPlayed = userPlayedGames.has(gameId);
  btn.classList.toggle('active', isPlayed);
  btn.title = isPlayed ? 'Jugado' : 'Marcar como jugado';
}

/**
 * Update the favorite button on a game card.
 * @param {number} gameId
 */
export function updateFavoriteButton(gameId) {
  const card = grid?.querySelector(`.game-card[data-id="${gameId}"]`);
  if (!card) return;

  const btn = card.querySelector('.favorite-btn');
  if (!btn) return;

  const isFavorite = userFavorites.has(gameId);
  btn.classList.toggle('active', isFavorite);
  btn.textContent = isFavorite ? '♥' : '♡';
}

/**
 * Update the favorites filter button state.
 */
export function updateFavoritesButtonState() {
  favoritesBtn?.classList.toggle('active', showOnlyFavorites);
  favoritesBtn?.setAttribute('aria-pressed', String(showOnlyFavorites));
}

/**
 * Toggle the favorites-only filter.
 */
export function doToggleFavoritesFilter() {
  if (!isLoggedIn()) {
    alert('Inicia sesión para ver tus favoritos.');
    return;
  }

  setShowOnlyFavorites(!showOnlyFavorites);
  updateFavoritesButtonState();
  applyFilters();
}

/**
 * Update the played filter button state.
 */
export function updatePlayedButtonState() {
  playedBtn?.classList.toggle('active', showOnlyPlayed);
  playedBtn?.setAttribute('aria-pressed', String(showOnlyPlayed));
}

/**
 * Toggle the played-only filter.
 */
export function doTogglePlayedFilter() {
  if (!isLoggedIn()) {
    alert('Inicia sesión para ver tus juegos jugados.');
    return;
  }

  setShowOnlyPlayed(!showOnlyPlayed);
  updatePlayedButtonState();
  applyFilters();
}

/**
 * Open the play order modal and render the list.
 */
export function openPlayOrderModal() {
  if (!isLoggedIn()) {
    alert('Inicia sesión para ver tu orden de juego.');
    return;
  }

  if (playOrderModal) playOrderModal.style.display = 'flex';
  renderPlayOrderList();
}

/**
 * Close the play order modal.
 */
export function closePlayOrderModal() {
  if (playOrderModal) playOrderModal.style.display = 'none';
}

/**
 * Add a game to the play order.
 * @param {number} gameId
 */
export async function addToPlayOrder(gameId) {
  if (!isLoggedIn() || !currentUser) {
    alert('Inicia sesión para usar el orden de juego.');
    return;
  }

  gameId = Number(gameId);
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  if (userPlayOrder.includes(gameId)) {
    processingPlayOrder.delete(gameId);
    return;
  }

  const newOrder = userPlayOrder.length;

  try {
    await turso.execute('INSERT INTO play_orders (user_id, game_id, sort_order) VALUES (?, ?, ?)', [currentUser.id, gameId, newOrder]);
    setUserPlayOrder([...userPlayOrder, gameId]);
    refreshListsUI();
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      if (!userPlayOrder.includes(gameId)) {
        setUserPlayOrder([...userPlayOrder, gameId]);
      }
      refreshListsUI();
    } else {
      alert('Error al agregar a orden de juego: ' + (err instanceof Error ? err.message : String(err)));
    }
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

/**
 * Remove a game from the play order.
 * @param {number} gameId
 */
export async function removeFromPlayOrder(gameId) {
  if (!isLoggedIn() || !currentUser) return;
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  try {
    await turso.execute('DELETE FROM play_orders WHERE user_id = ? AND game_id = ?', [currentUser.id, gameId]);
    setUserPlayOrder(userPlayOrder.filter(id => id !== gameId));
    await savePlayOrder();
    refreshListsUI();
  } catch (err) {
    alert('Error al quitar de orden de juego: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

/**
 * Move a game up or down in the play order.
 * @param {number} gameId
 * @param {number} direction
 */
export async function movePlayOrder(gameId, direction) {
  if (!isLoggedIn() || !currentUser) return;
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  const idx = userPlayOrder.indexOf(gameId);
  if (idx === -1) {
    processingPlayOrder.delete(gameId);
    return;
  }

  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= userPlayOrder.length) {
    processingPlayOrder.delete(gameId);
    return;
  }

  const newOrder = [...userPlayOrder];
  [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
  setUserPlayOrder(newOrder);

  try {
    await savePlayOrder();
    refreshListsUI();
  } catch (err) {
    alert('Error al reordenar: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

/**
 * Persist the current play order to the database.
 */
export async function savePlayOrder() {
  if (!isLoggedIn() || !currentUser) return;

  for (let i = 0; i < userPlayOrder.length; i++) {
    await turso.execute('UPDATE play_orders SET sort_order = ? WHERE user_id = ? AND game_id = ?', [i, currentUser.id, userPlayOrder[i]]);
  }
}

/**
 * Move a game to an explicit rank in the play order.
 * @param {number} gameId
 * @param {number} newRank
 */
export async function setPlayOrderRank(gameId, newRank) {
  if (!isLoggedIn() || !currentUser) return;
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  const currentIdx = userPlayOrder.indexOf(gameId);
  if (currentIdx === -1) {
    processingPlayOrder.delete(gameId);
    return;
  }

  const maxRank = userPlayOrder.length - 1;
  newRank = Math.min(Math.max(newRank, 0), maxRank);

  if (newRank === currentIdx) {
    processingPlayOrder.delete(gameId);
    return;
  }

  const newOrder = [...userPlayOrder];
  newOrder.splice(currentIdx, 1);
  newOrder.splice(newRank, 0, gameId);
  setUserPlayOrder(newOrder);

  try {
    await savePlayOrder();
    renderPlayOrderList();
  } catch (err) {
    alert('Error al reordenar: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

/**
 * Refresh both the game grid and the play order modal.
 */
export function refreshListsUI() {
  applyFilters();
  if (playOrderModal?.style.display === 'flex') {
    renderPlayOrderList();
  }
}

/**
 * Determine the target rank for a drag based on pointer position.
 * @param {HTMLElement} list
 * @param {number} clientY
 * @param {number} draggedId
 * @returns {number}
 */
export function getDragTargetRank(list, clientY, draggedId) {
  const items = [...list.querySelectorAll('.play-order-item')];
  let rank = 0;

  for (const item of items) {
    if (parseInt(item.dataset.gameId, 10) === draggedId) continue;

    const rect = item.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (clientY <= mid) break;
    rank++;
  }

  return rank;
}

/**
 * Render the play order list inside the modal.
 */
export function renderPlayOrderList() {
  if (!playOrderListEl) return;

  const orderedGames = userPlayOrder
    .map(id => allGames.find(g => g.id === id))
    .filter(Boolean);

  if (orderedGames.length === 0) {
    playOrderListEl.innerHTML = '<div class="empty-state">No tienes juegos en tu orden de juego.</div>';
    return;
  }

  playOrderListEl.innerHTML = '';

  for (let i = 0; i < orderedGames.length; i++) {
    const game = orderedGames[i];
    if (!game) continue;

    const el = document.createElement('div');
    el.className = 'list-modal-item play-order-item';
    el.dataset.gameId = String(game.id);
    el.innerHTML = playOrderItem(game, i, orderedGames.length, userPlayedGames.has(game.id));

    const input = el.querySelector('.play-order-rank');
    input?.addEventListener('change', () => {
      const rank = parseInt(input.value, 10);
      if (!Number.isFinite(rank)) return;
      setPlayOrderRank(game.id, rank - 1);
    });
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
    });

    const dragHandle = el.querySelector('.drag-handle');
    dragHandle?.addEventListener('dragstart', e => {
      setDraggedPlayOrderId(game.id);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(game.id));
        try {
          e.dataTransfer.setDragImage(el, 0, 0);
        } catch {
          // Some browsers don't support setDragImage; ignore.
        }
      }
      el.classList.add('dragging');
    });

    dragHandle?.addEventListener('dragend', () => {
      setDraggedPlayOrderId(null);
      el.classList.remove('dragging');
      playOrderListEl?.querySelectorAll('.play-order-item').forEach(item => item.classList.remove('drag-over'));
    });

    playOrderListEl.appendChild(el);
  }
}
