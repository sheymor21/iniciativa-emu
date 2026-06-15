// @ts-check

import {
  favoritesBtn,
  playOrderBtn,
  playedBtn,
} from './elements.js';
import {
  userFavorites,
  userPlayOrder,
  userPlayedGames,
} from './state.js';

/**
 * Update the text of the main action buttons to show the number of items they contain.
 */
export function updateTabCounts() {
  if (favoritesBtn) favoritesBtn.textContent = `Favoritos (${userFavorites.size})`;
  if (playedBtn) playedBtn.textContent = `Jugados (${userPlayedGames.size})`;
  if (playOrderBtn) playOrderBtn.textContent = `Orden de juego (${userPlayOrder.length})`;
}
