// @ts-check

import { escapeHtml, pluralize, renderStars, roleLabel } from './utils.js';

/**
 * @typedef {import('./state.js').Game} Game
 */

/**
 * @param {Game} game
 * @returns {string}
 */
export function scoreDisplay(game) {
  if (game.ratingCount === 0) {
    return '<span class="rating-score" style="color:var(--text-muted);font-size:1rem;">Sin ranking</span>';
  }
  return `<span class="rating-score">${game.avgScore.toFixed(1)}</span> <span class="rating-stars">${renderStars(game.avgScore)}</span>`;
}

/**
 * @param {Game} game
 * @returns {string}
 */
export function votersDisplay(game) {
  if (game.ratingCount === 0) return '';
  return `<div class="rating-votes" title="${escapeHtml(game.ratingVotes)}">${escapeHtml(game.ratingVotes)}</div>`;
}

/**
 * @param {Game} game
 * @param {object} options
 * @param {boolean} options.isLoggedIn
 * @param {boolean} options.isFavorite
 * @param {boolean} options.isPlayed
 * @param {boolean} options.inPlayOrder
 * @param {boolean} options.showPlayOrderButton
 * @param {boolean} options.canVote
 * @param {boolean} options.canReview
 * @param {string} authorName
 * @param {boolean} authorReadonly
 * @returns {string}
 */
export function gameCard(game, options, authorName, authorReadonly) {
  const favoriteHtml = options.isLoggedIn ? `
    <button class="btn favorite-btn ${options.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${game.id})" title="Favorito">
      ${options.isFavorite ? '♥' : '♡'}
    </button>
  ` : '';

  const playedHtml = options.isLoggedIn ? `
    <button class="btn played-btn ${options.isPlayed ? 'active' : ''}" onclick="togglePlayed(${game.id})" title="${options.isPlayed ? 'Jugado' : 'Marcar como jugado'}">
      Jugado
    </button>
  ` : '';

  const playOrderCardHtml = options.showPlayOrderButton ? `
    <button class="btn btn-secondary play-order-card-btn" onclick="addToPlayOrder(${game.id})" ${options.inPlayOrder ? 'disabled' : ''} title="Añadir a orden de juego">
      ${options.inPlayOrder ? 'En orden' : 'Jugar después'}
    </button>
  ` : '';

  const rateGameHtml = options.canVote ? `
    <div class="rate-game">
      <input type="text" placeholder="Tu nombre" aria-label="Tu nombre" id="rate-author-${game.id}" maxlength="50" value="${escapeHtml(authorName)}" ${authorReadonly}>
      <input type="number" min="1" max="10" placeholder="1-10" aria-label="Puntuación" id="rate-input-${game.id}">
      <button class="btn btn-primary" onclick="submitRating(${game.id})">Votar</button>
    </div>
  ` : '';

  const addReviewHtml = options.canReview ? `
    <div class="add-review" id="add-review-${game.id}" style="display:none;">
      <input type="text" id="review-author-${game.id}" placeholder="Tu nombre" maxlength="50" value="${escapeHtml(authorName)}" ${authorReadonly}>
      <textarea id="review-content-${game.id}" placeholder="Escribe tu reseña..." maxlength="1000"></textarea>
      <button class="btn btn-primary" onclick="submitReview(${game.id})">Enviar reseña</button>
    </div>
  ` : '';

  return `
    <div class="game-header">
      <h2 class="game-title">${escapeHtml(game.name)}</h2>
      <div class="game-header-actions">
        <span class="game-console">${escapeHtml(game.console)}</span>
        ${playedHtml}
        ${favoriteHtml}
        ${playOrderCardHtml}
      </div>
    </div>
    <div class="game-genre">${escapeHtml(game.genre)}</div>
    <div class="game-rating">
      ${scoreDisplay(game)}
      <span class="rating-count">${game.ratingCount} ${pluralize(game.ratingCount, 'voto')}</span>
    </div>
    ${votersDisplay(game)}
    ${rateGameHtml}
    <div class="reviews-section">
      <div class="reviews-header">
        <h3 class="reviews-title">Reseñas (${game.reviewCount})</h3>
        <button class="btn btn-secondary" onclick="toggleReviews(${game.id}, this)">Ver</button>
      </div>
      <div class="review-list" id="reviews-${game.id}" style="display:none;"></div>
      ${addReviewHtml}
    </div>
  `;
}

/**
 * @param {object} review
 * @param {boolean} userPositive
 * @param {boolean} userNegative
 * @returns {string}
 */
export function reviewItem(review, userPositive, userNegative) {
  const positiveClass = userPositive ? 'btn-success active' : 'btn-success';
  const negativeClass = userNegative ? 'btn-danger active' : 'btn-danger';

  return `
    <div class="review-author">${escapeHtml(review.author)}</div>
    <p class="review-content">${escapeHtml(review.content)}</p>
    <div class="review-actions">
      <button class="btn ${positiveClass}" onclick="voteReview(${review.id}, 'positive')">👍 ${review.positives}</button>
      <button class="btn ${negativeClass}" onclick="voteReview(${review.id}, 'negative')">👎 ${review.negatives}</button>
    </div>
  `;
}

/**
 * @param {Game} game
 * @param {number} index
 * @param {number} total
 * @param {boolean} isPlayed
 * @returns {string}
 */
export function playOrderItem(game, index, total, isPlayed) {
  return `
    <span class="drag-handle" title="Arrastrar para reordenar" draggable="true">⋮⋮</span>
    <input type="number" class="play-order-rank" min="1" max="${total}" value="${index + 1}" aria-label="Posición">
    <div class="list-modal-item-info">
      <strong>${escapeHtml(game.name)}</strong>
      <span>${escapeHtml(game.console)} · ${escapeHtml(game.genre)}</span>
    </div>
    <div class="list-modal-item-actions">
      <button class="btn ${isPlayed ? 'btn-success' : 'btn-secondary'}" onclick="togglePlayed(${game.id})" title="${isPlayed ? 'Jugado' : 'Marcar como jugado'}">
        Jugado
      </button>
      <button class="btn btn-secondary" onclick="movePlayOrder(${game.id}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn btn-secondary" onclick="movePlayOrder(${game.id}, 1)" ${index === total - 1 ? 'disabled' : ''}>↓</button>
      <button class="btn btn-danger" onclick="removeFromPlayOrder(${game.id})">Quitar</button>
    </div>
  `;
}

/**
 * @param {import('./state.js').UserRow} user
 * @returns {string}
 */
export function adminUserRow(user) {
  return `
    <td>${user.id}</td>
    <td>${escapeHtml(user.username)}</td>
    <td>${escapeHtml(user.display_name)}</td>
    <td>${escapeHtml(roleLabel(user.role))}</td>
    <td>
      <button class="btn btn-primary admin-user-edit-btn" data-id="${user.id}">Editar</button>
      <button class="btn btn-secondary admin-user-password-btn" data-id="${user.id}">Cambiar pass</button>
      <button class="btn btn-danger admin-user-delete-btn" data-id="${user.id}">Eliminar</button>
    </td>
  `;
}

/**
 * @param {Game} game
 * @returns {string}
 */
export function adminGameRow(game) {
  return `
    <td>${game.id}</td>
    <td>${escapeHtml(game.name)}</td>
    <td>${escapeHtml(game.console)}</td>
    <td>${escapeHtml(game.genre)}</td>
    <td>
      <button class="btn btn-primary admin-edit-btn" data-id="${game.id}">Editar</button>
      <button class="btn btn-danger admin-delete-btn" data-id="${game.id}">Eliminar</button>
    </td>
  `;
}

/**
 * @param {object} rating
 * @returns {string}
 */
export function editRatingItem(rating) {
  return `
    <input type="text" id="edit-rating-author-${rating.id}" value="${escapeHtml(rating.author)}" placeholder="Autor" maxlength="50">
    <input type="number" id="edit-rating-score-${rating.id}" value="${rating.score}" min="1" max="10" placeholder="1-10">
    <div class="edit-list-actions">
      <button class="btn btn-primary edit-rating-save" data-id="${rating.id}">Guardar</button>
      <button class="btn btn-danger edit-rating-delete" data-id="${rating.id}">Eliminar</button>
    </div>
  `;
}

/**
 * @param {object} review
 * @returns {string}
 */
export function editReviewItem(review) {
  return `
    <input type="text" id="edit-review-author-${review.id}" value="${escapeHtml(review.author)}" placeholder="Autor" maxlength="50">
    <textarea id="edit-review-content-${review.id}" placeholder="Reseña..." maxlength="1000">${escapeHtml(review.content)}</textarea>
    <div class="review-votes-count">👍 ${review.positives} &nbsp; 👎 ${review.negatives}</div>
    <div class="edit-list-actions">
      <button class="btn btn-primary edit-review-save" data-id="${review.id}">Guardar</button>
      <button class="btn btn-danger edit-review-delete" data-id="${review.id}">Eliminar</button>
    </div>
  `;
}
