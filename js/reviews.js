// @ts-check

import { turso } from './turso-client.js';
import { allGames, canReview, currentUser } from './state.js';
import { escapeHtml, pluralize } from './utils.js';
import { reviewItem, scoreDisplay, votersDisplay } from './templates.js';

/**
 * Toggle the review list visibility for a game.
 * @param {number} gameId
 * @param {HTMLButtonElement} button
 */
export async function toggleReviews(gameId, button) {
  const list = document.getElementById(`reviews-${gameId}`);
  const form = document.getElementById(`add-review-${gameId}`);

  if (!list) return;

  if (list.style.display === 'none') {
    list.style.display = 'flex';
    if (form) form.style.display = 'flex';
    button.textContent = 'Ocultar';
    button.classList.add('expanded');
    button.setAttribute('aria-expanded', 'true');
    await loadReviews(gameId);
  } else {
    list.style.display = 'none';
    if (form) form.style.display = 'none';
    const count = button.dataset.count || '0';
    button.textContent = `Reseñas (${count})`;
    button.classList.remove('expanded');
    button.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Toggle the rating form for a game.
 * @param {number} gameId
 * @param {HTMLButtonElement} button
 */
export function toggleRateForm(gameId, button) {
  const form = document.getElementById(`rate-form-${gameId}`);
  if (!form) return;

  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'flex' : 'none';
  button.textContent = isHidden ? 'Cancelar' : 'Votar';
  button.classList.toggle('expanded', isHidden);
  button.setAttribute('aria-expanded', String(isHidden));

  if (isHidden) {
    const input = document.getElementById(`rate-input-${gameId}`);
    input?.focus();
  }
}

/**
 * Load and render reviews for a game.
 * @param {number} gameId
 */
export async function loadReviews(gameId) {
  const list = document.getElementById(`reviews-${gameId}`);
  if (!list) return;

  list.innerHTML = '<div class="loading">Cargando reseñas...</div>';

  try {
    const voter = currentUser?.username || '';
    const { rows } = await turso.execute(`
      SELECT
        rv.id,
        rv.author,
        rv.content,
        COALESCE(SUM(CASE WHEN v.vote_type = 'positive' THEN 1 ELSE 0 END), 0) AS positives,
        COALESCE(SUM(CASE WHEN v.vote_type = 'negative' THEN 1 ELSE 0 END), 0) AS negatives,
        MAX(CASE WHEN v.voter = ? AND v.vote_type = 'positive' THEN 1 ELSE 0 END) AS user_positive,
        MAX(CASE WHEN v.voter = ? AND v.vote_type = 'negative' THEN 1 ELSE 0 END) AS user_negative
      FROM reviews rv
      LEFT JOIN review_votes v ON v.review_id = rv.id
      WHERE rv.game_id = ?
      GROUP BY rv.id, rv.author, rv.content
      ORDER BY rv.created_at DESC
    `, [voter, voter, gameId]);

    if (rows.length === 0) {
      list.innerHTML = '<div class="empty-state" style="padding:1rem;">Aún no hay reseñas.</div>';
      return;
    }

    list.innerHTML = '';
    for (const review of rows) {
      const el = document.createElement('div');
      el.className = 'review';
      el.innerHTML = reviewItem(review, Boolean(review.user_positive), Boolean(review.user_negative));
      list.appendChild(el);
    }
  } catch (err) {
    list.innerHTML = `<div class="error">Error cargando reseñas: ${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`;
  }
}

/**
 * Submit a new review for a game.
 * @param {number} gameId
 */
export async function submitReview(gameId) {
  if (!canReview()) {
    alert('Los invitados no pueden escribir reseñas. Inicia sesión con una cuenta de usuario.');
    return;
  }

  const authorInput = document.getElementById(`review-author-${gameId}`);
  const contentInput = document.getElementById(`review-content-${gameId}`);
  const author = currentUser ? currentUser.display_name : authorInput?.value.trim();
  const content = contentInput?.value.trim();

  if (!author || !content) {
    alert('Completa tu nombre y la reseña.');
    return;
  }

  try {
    await turso.execute('INSERT INTO reviews (game_id, author, content) VALUES (?, ?, ?)', [gameId, author, content]);
    if (!currentUser && authorInput) authorInput.value = '';
    if (contentInput) contentInput.value = '';
    await loadReviews(gameId);
    await updateGameReviewCount(gameId);
  } catch (err) {
    alert('Error al enviar reseña: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Update the rating display for a single game card in the DOM.
 * @param {number} gameId
 */
async function updateGameCardRating(gameId) {
  const { rows } = await turso.execute(`
    SELECT
      COALESCE(AVG(r.score), 0) AS avg_score,
      COUNT(DISTINCT r.id) AS rating_count,
      COALESCE(GROUP_CONCAT(r.author || ': ' || r.score, ' | '), '') AS rating_votes
    FROM games g
    LEFT JOIN ratings r ON r.game_id = g.id
    WHERE g.id = ?
  `, [gameId]);

  if (rows.length === 0) return;

  const row = rows[0];
  const avgScore = Math.round(Number(row.avg_score) * 10) / 10;
  const ratingCount = Number(row.rating_count);
  const ratingVotes = String(row.rating_votes);

  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  game.avgScore = avgScore;
  game.ratingCount = ratingCount;
  game.ratingVotes = ratingVotes;

  const card = document.querySelector(`.game-card[data-id="${gameId}"]`);
  if (!card) return;

  const ratingEl = card.querySelector('.game-rating');
  if (ratingEl) {
    ratingEl.innerHTML = `
      ${scoreDisplay(game)}
      <span class="rating-count">${ratingCount === 0 ? 'Sin votos' : `${ratingCount} ${pluralize(ratingCount, 'voto')}`}</span>
    `;
  }

  const votersEl = card.querySelector('.rating-votes');
  if (ratingCount === 0) {
    if (votersEl) votersEl.remove();
  } else {
    const votersHtml = votersDisplay(game);
    if (votersEl) {
      votersEl.outerHTML = votersHtml;
    } else {
      const ratingEl2 = card.querySelector('.game-rating');
      if (ratingEl2) {
        ratingEl2.insertAdjacentHTML('afterend', votersHtml);
      }
    }
  }
}

/**
 * Update the review count for a single game card in the DOM.
 * @param {number} gameId
 */
async function updateGameReviewCount(gameId) {
  const { rows } = await turso.execute(`
    SELECT COUNT(DISTINCT rv.id) AS review_count
    FROM reviews rv
    WHERE rv.game_id = ?
  `, [gameId]);

  if (rows.length === 0) return;

  const reviewCount = Number(rows[0].review_count);
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  game.reviewCount = reviewCount;

  const card = document.querySelector(`.game-card[data-id="${gameId}"]`);
  if (!card) return;

  const reviewsToggle = card.querySelector('.reviews-toggle');
  if (reviewsToggle) {
    reviewsToggle.textContent = `Reseñas (${reviewCount})`;
    reviewsToggle.dataset.count = String(reviewCount);
  }
}

/**
 * Update the vote buttons for a single review in the DOM.
 * @param {number} reviewId
 */
async function updateReviewVoteButtons(reviewId) {
  const voter = currentUser?.username || '';
  const { rows } = await turso.execute(`
    SELECT
      COALESCE(SUM(CASE WHEN v.vote_type = 'positive' THEN 1 ELSE 0 END), 0) AS positives,
      COALESCE(SUM(CASE WHEN v.vote_type = 'negative' THEN 1 ELSE 0 END), 0) AS negatives,
      MAX(CASE WHEN v.voter = ? AND v.vote_type = 'positive' THEN 1 ELSE 0 END) AS user_positive,
      MAX(CASE WHEN v.voter = ? AND v.vote_type = 'negative' THEN 1 ELSE 0 END) AS user_negative
    FROM review_votes v
    WHERE v.review_id = ?
  `, [voter, voter, reviewId]);

  if (rows.length === 0) return;

  const row = rows[0];
  const positives = Number(row.positives);
  const negatives = Number(row.negatives);
  const userPositive = Boolean(row.user_positive);
  const userNegative = Boolean(row.user_negative);

  const reviewBtn = document.querySelector(`.review button[onclick*="voteReview(${reviewId},"]`);
  if (!reviewBtn) return;

  const actions = reviewBtn.closest('.review-actions');
  if (!actions) return;

  const positiveClass = userPositive ? 'btn-success active' : 'btn-success';
  const negativeClass = userNegative ? 'btn-danger active' : 'btn-danger';

  actions.innerHTML = `
    <button class="btn ${positiveClass}" onclick="voteReview(${reviewId}, 'positive')">👍 ${positives}</button>
    <button class="btn ${negativeClass}" onclick="voteReview(${reviewId}, 'negative')">👎 ${negatives}</button>
  `;
}

/**
 * Submit a rating for a game.
 * @param {number} gameId
 */
export async function submitRating(gameId) {
  if (!canReview()) {
    alert('Los invitados no pueden votar. Inicia sesión con una cuenta de usuario.');
    return;
  }

  const authorInput = document.getElementById(`rate-author-${gameId}`);
  const scoreInput = document.getElementById(`rate-input-${gameId}`);
  const author = currentUser ? currentUser.display_name : authorInput?.value.trim();
  const score = parseInt(scoreInput?.value, 10);

  if (!author) {
    alert('Escribe tu nombre para votar.');
    return;
  }

  if (Number.isNaN(score) || score < 1 || score > 10) {
    alert('La puntuación debe ser un número entre 1 y 10.');
    return;
  }

  try {
    await turso.execute('DELETE FROM ratings WHERE game_id = ? AND author = ?', [gameId, author]);
    await turso.execute('INSERT INTO ratings (game_id, author, score) VALUES (?, ?, ?)', [gameId, author, score]);
    if (!currentUser && authorInput) authorInput.value = '';
    if (scoreInput) scoreInput.value = '';
    await updateGameCardRating(gameId);
  } catch (err) {
    alert('Error al votar: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Vote on a review (positive/negative) or remove an existing vote.
 * @param {number} reviewId
 * @param {'positive'|'negative'} voteType
 */
export async function voteReview(reviewId, voteType) {
  if (!canReview()) {
    alert('Los invitados no pueden votar reseñas. Inicia sesión con una cuenta de usuario.');
    return;
  }

  const voter = currentUser?.username;
  if (!voter) return;

  try {
    const { rows } = await turso.execute(
      'SELECT vote_type FROM review_votes WHERE review_id = ? AND voter = ?',
      [reviewId, voter],
    );

    if (rows.length === 0) {
      await turso.execute(
        'INSERT INTO review_votes (review_id, vote_type, voter) VALUES (?, ?, ?)',
        [reviewId, voteType, voter],
      );
    } else if (rows[0].vote_type === voteType) {
      await turso.execute(
        'DELETE FROM review_votes WHERE review_id = ? AND voter = ?',
        [reviewId, voter],
      );
    } else {
      await turso.execute(
        'UPDATE review_votes SET vote_type = ? WHERE review_id = ? AND voter = ?',
        [voteType, reviewId, voter],
      );
    }

    await updateReviewVoteButtons(reviewId);
  } catch (err) {
    alert('Error al votar: ' + (err instanceof Error ? err.message : String(err)));
  }
}
