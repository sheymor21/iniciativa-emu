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
    return '';
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
 * @param {string} _authorName
 * @param {boolean} _authorReadonly
 * @returns {string}
 */
export function gameCard(game, options, _authorName, _authorReadonly) {
  const favoriteHtml = options.isLoggedIn ? `
    <button class="btn btn-icon favorite-btn ${options.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${game.id})" title="Favorito" aria-label="Favorito">
      ${options.isFavorite ? '♥' : '♡'}
    </button>
  ` : '';

  const playedHtml = options.isLoggedIn ? `
    <button class="btn btn-icon played-btn ${options.isPlayed ? 'active' : ''}" onclick="togglePlayed(${game.id})" title="${options.isPlayed ? 'Jugado' : 'Marcar como jugado'}" aria-label="${options.isPlayed ? 'Jugado' : 'Marcar como jugado'}">
      ✓
    </button>
  ` : '';

  const playOrderCardHtml = options.showPlayOrderButton ? `
    <button class="btn btn-icon btn-secondary play-order-card-btn" onclick="addToPlayOrder(${game.id})" ${options.inPlayOrder ? 'disabled' : ''} title="Añadir a orden de juego" aria-label="Añadir a orden de juego">
      ${options.inPlayOrder ? '✓' : '+'}
    </button>
  ` : '';

  const rateGameHtml = options.canVote ? `
    <div class="rate-game">
      <button class="btn btn-text rate-toggle" onclick="toggleRateForm(${game.id}, this)" aria-expanded="false">Votar</button>
      <div class="rate-form" id="rate-form-${game.id}" style="display:none;">
        <input type="number" min="1" max="10" placeholder="1-10" aria-label="Puntuación" id="rate-input-${game.id}">
        <button class="btn btn-primary" onclick="submitRating(${game.id})">Enviar</button>
      </div>
    </div>
  ` : '';

  const addReviewHtml = options.canReview ? `
    <div class="add-review" id="add-review-${game.id}" style="display:none;">
      <textarea id="review-content-${game.id}" placeholder="Escribe tu reseña..." maxlength="1000"></textarea>
      <button class="btn btn-primary" onclick="submitReview(${game.id})">Enviar reseña</button>
    </div>
  ` : '';

  const coverHtml = game.cover_url ? `
    <img class="game-cover" loading="lazy" src="${escapeHtml(game.cover_url)}" alt="Carátula de ${escapeHtml(game.name)}">
  ` : '';

  return `
    ${coverHtml}
    <div class="game-header">
      <h2 class="game-title">${escapeHtml(game.name)}</h2>
      <div class="game-header-actions">
        <button class="btn btn-icon copy-btn" onclick="copyGameName('${escapeHtml(game.name)}', this)" title="Copiar nombre" aria-label="Copiar nombre">⧉</button>
        ${favoriteHtml}
        ${playedHtml}
        ${playOrderCardHtml}
      </div>
    </div>
    <div class="game-meta">
      <span class="game-console">${escapeHtml(game.console)}</span>
      <span class="game-genre">${escapeHtml(game.genre)}</span>
    </div>
    <div class="game-rating">
      ${scoreDisplay(game)}
      <span class="rating-count">${game.ratingCount === 0 ? 'Sin votos' : `${game.ratingCount} ${pluralize(game.ratingCount, 'voto')}`}</span>
    </div>
    ${votersDisplay(game)}
    ${rateGameHtml}
    <div class="reviews-section">
      <button class="btn btn-text reviews-toggle" onclick="toggleReviews(${game.id}, this)" data-count="${game.reviewCount}">Reseñas (${game.reviewCount})</button>
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
 * @param {object} suggestion
 * @param {object} labels
 * @param {string} labels.typeLabel
 * @param {string} labels.statusLabel
 * @param {string} labels.statusClass
 * @param {string} labels.date
 * @param {boolean} [labels.showAdminActions]
 * @returns {string}
 */
export function suggestionRow(suggestion, labels) {
  const adminActions = labels.showAdminActions ? `
    <button class="btn btn-success suggestion-complete-btn" data-id="${suggestion.id}">Completar</button>
    <button class="btn btn-danger suggestion-deny-btn" data-id="${suggestion.id}">Denegar</button>
  ` : '';
  return `
    <td>${suggestion.id}</td>
    <td>${escapeHtml(labels.typeLabel)}</td>
    <td>${escapeHtml(suggestion.title)}</td>
    <td>${escapeHtml(suggestion.author)}</td>
    <td><span class="badge ${labels.statusClass}">${escapeHtml(labels.statusLabel)}</span></td>
    <td>${escapeHtml(labels.date)}</td>
    <td>
      <button class="btn btn-primary suggestion-view-btn" data-id="${suggestion.id}">Ver</button>
      ${adminActions}
    </td>
  `;
}

/**
 * @param {object} suggestion
 * @param {object} labels
 * @param {string} labels.typeLabel
 * @param {string} labels.statusLabel
 * @param {string} labels.statusClass
 * @param {string} labels.date
 * @returns {string}
 */
export function userSuggestionRow(suggestion, labels) {
  return `
    <td>${escapeHtml(labels.typeLabel)}</td>
    <td>${escapeHtml(suggestion.title)}</td>
    <td><span class="badge ${labels.statusClass}">${escapeHtml(labels.statusLabel)}</span></td>
    <td>${escapeHtml(labels.date)}</td>
    <td>
      <button class="btn btn-primary suggestion-view-btn" data-id="${suggestion.id}">Ver</button>
    </td>
  `;
}

/**
 * @param {object} comment
 * @param {string} date
 * @returns {string}
 */
export function suggestionCommentItem(comment, date) {
  return `
    <div class="suggestion-comment-author">${escapeHtml(comment.author)} <span>${escapeHtml(date)}</span></div>
    <p class="suggestion-comment-content">${escapeHtml(comment.content)}</p>
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
