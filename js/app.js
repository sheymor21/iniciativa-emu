class TursoClient {
  constructor(url, token) {
    if (!url) {
      throw new Error('TURSO_CONFIG.url is required');
    }
    // Turso URLs may be returned as libsql://; the HTTPS API endpoint is the same host with https://
    const httpsUrl = url.replace(/^libsql:\/\//, 'https://');
    if (!httpsUrl.startsWith('https://')) {
      throw new Error('TURSO_CONFIG.url must start with https:// or libsql://');
    }
    this.url = httpsUrl.replace(/\/$/, '') + '/v2/pipeline';
    this.token = token;
  }

  async fetchWithRetry(requestInit, maxAttempts = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fetch(this.url, requestInit);
      } catch (fetchErr) {
        lastErr = fetchErr;
        const isLastAttempt = attempt === maxAttempts;
        if (!isLastAttempt) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const tips = [
      'Revisa tu conexión a internet.',
      'Si usas una extensión de bloqueo de anuncios o privacidad, prueba desactivarla para este sitio.',
      'Verifica que js/config.js tenga la URL y token correctos de Turso.',
    ];
    throw new Error(`Network error connecting to ${this.url}: ${lastErr.message}. ${tips.join(' ')}`);
  }

  toTursoArg(value) {
    if (value === null || value === undefined) {
      return { type: 'null' };
    }
    if (Number.isInteger(value)) {
      return { type: 'integer', value: String(value) };
    }
    if (typeof value === 'number') {
      return { type: 'float', value };
    }
    return { type: 'text', value: String(value) };
  }

  async execute(sql, args = []) {
    const body = {
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(arg => this.toTursoArg(arg)) } },
        { type: 'close' },
      ],
    };

    const requestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };

    const response = await this.fetchWithRetry(requestInit);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Turso HTTP ${response.status} at ${this.url}: ${text}`);
    }

    const data = await response.json();
    const results = data.results || [];
    const executeResult = results.find(r => r.type === 'ok' && r.response?.type === 'execute');

    if (!executeResult) {
      const errorResult = results.find(r => r.type === 'error');
      if (errorResult) throw new Error(`Turso error: ${errorResult.error?.message || JSON.stringify(errorResult)}`);
      return { rows: [], cols: [] };
    }

    const result = executeResult.response.result;
    const cols = result.cols.map(c => c.name);

    const parseCell = (cell) => {
      if (cell === null || cell === undefined) return null;
      if (typeof cell !== 'object') return cell;
      if (cell.type === 'null') return null;
      return cell.value;
    };

    const rows = result.rows.map(row => {
      const obj = {};
      row.forEach((cell, index) => {
        obj[cols[index]] = parseCell(cell);
      });
      return obj;
    });

    return { rows, cols, affectedRows: result.affected_row_count };
  }
}

const turso = new TursoClient(TURSO_CONFIG.url, TURSO_CONFIG.token);

let allGames = [];
let consoles = [];
let allUsers = [];
let currentUser = null;
let userFavorites = new Set();
let userPlayOrder = [];
let showOnlyFavorites = false;
const processingFavorites = new Set();
const processingPlayOrder = new Set();
let draggedPlayOrderId = null;

function loadCurrentUser() {
  try {
    const saved = sessionStorage.getItem('currentUser');
    if (saved) {
      currentUser = JSON.parse(saved);
      if (currentUser && currentUser.id != null) {
        currentUser.id = Number(currentUser.id);
      }
    }
  } catch {
    currentUser = null;
  }
}

function saveCurrentUser() {
  sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function clearCurrentUser() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
}

function isAdmin() { return currentUser?.role === 'admin'; }
function isUser() { return currentUser?.role === 'user'; }
function canVote() { return isAdmin() || isUser(); }
function canReview() { return isAdmin() || isUser(); }
function isLoggedIn() { return !!currentUser && currentUser.role !== 'guest'; }

function roleLabel(role) {
  const labels = { admin: 'Admin', user: 'Usuario', guest: 'Invitado' };
  return labels[role] || role;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const grid = document.getElementById('games-grid');
const countEl = document.getElementById('result-count');
const filterName = document.getElementById('filter-name');
const filterConsole = document.getElementById('filter-console');
const filterRank = document.getElementById('filter-rank');
const filterReviews = document.getElementById('filter-reviews');
const sortBy = document.getElementById('sort-by');
const refreshBtn = document.getElementById('refresh-btn');

async function loadGames() {
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

    allGames = rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      console: row.console,
      genre: row.genre,
      avgScore: Math.round(row.avg_score * 10) / 10,
      ratingCount: row.rating_count,
      ratingVotes: row.rating_votes,
      reviewCount: row.review_count,
    }));

    consoles = [...new Set(allGames.map(g => g.console))].sort();
    populateConsoleFilter();
    await loadUserLists();
    applyFilters();
  } catch (err) {
    grid.innerHTML = `<div class="error">
      <strong>Error cargando juegos:</strong><br>
      ${escapeHtml(err.message)}<br><br>
      Revisa que <code>js/config.js</code> tenga la URL completa de Turso (empieza con <code>https://</code>) y un token válido.
    </div>`;
    countEl.textContent = 'Error';
  }
}

async function loadUserLists() {
  userFavorites = new Set();
  userPlayOrder = [];
  if (!isLoggedIn()) return;

  try {
    const userId = Number(currentUser.id);
    const [favResult, orderResult] = await Promise.all([
      turso.execute('SELECT game_id FROM favorites WHERE user_id = ?', [userId]),
      turso.execute('SELECT game_id FROM play_orders WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC', [userId]),
    ]);
    favResult.rows.forEach(r => userFavorites.add(Number(r.game_id)));
    userPlayOrder = orderResult.rows.map(r => Number(r.game_id));
  } catch (err) {
    console.error('Error loading user lists:', err);
  }
}

function populateConsoleFilter() {
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

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderStars(score) {
  const full = Math.floor(score / 2);
  const half = score % 2 >= 1 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function applyFilters() {
  const nameQuery = filterName.value.trim().toLowerCase();
  const consoleValue = filterConsole.value;
  const rankValue = filterRank.value;
  const reviewsValue = filterReviews.value;
  const sortValue = sortBy.value;

  let filtered = allGames.filter(game => {
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

    return true;
  });

  filtered.sort((a, b) => {
    switch (sortValue) {
      case 'name': return a.name.localeCompare(b.name);
      case 'console': return a.console.localeCompare(b.console) || a.name.localeCompare(b.name);
      case 'rank-desc': return b.avgScore - a.avgScore || a.name.localeCompare(b.name);
      case 'rank-asc': return a.avgScore - b.avgScore || a.name.localeCompare(b.name);
      case 'reviews-desc': return b.reviewCount - a.reviewCount || a.name.localeCompare(b.name);
      case 'play-order': {
        const idxA = userPlayOrder.indexOf(a.id);
        const idxB = userPlayOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      }
      default: return 0;
    }
  });

  countEl.textContent = `${filtered.length} juego${filtered.length !== 1 ? 's' : ''}`;
  renderGames(filtered);
}

function renderGames(games) {
  if (games.length === 0) {
    grid.innerHTML = '<div class="empty-state">No se encontraron juegos con esos filtros.</div>';
    return;
  }

  grid.innerHTML = '';
  for (const game of games) {
    const card = document.createElement('article');
    card.className = 'game-card';
    card.dataset.id = game.id;

    const scoreDisplay = game.ratingCount > 0
      ? `<span class="rating-score">${game.avgScore.toFixed(1)}</span> <span class="rating-stars">${renderStars(game.avgScore)}</span>`
      : '<span class="rating-score" style="color:var(--text-muted);font-size:1rem;">Sin ranking</span>';

    const votersDisplay = game.ratingCount > 0
      ? `<div class="rating-votes" title="${escapeHtml(game.ratingVotes)}">${escapeHtml(game.ratingVotes)}</div>`
      : '';

    const authorName = escapeHtml(currentUser?.display_name || '');
    const authorReadonly = currentUser ? 'readonly' : '';

    const favoriteHtml = isLoggedIn() ? `
      <button class="btn favorite-btn ${userFavorites.has(game.id) ? 'active' : ''}" onclick="toggleFavorite(${game.id})" title="Favorito">
        ${userFavorites.has(game.id) ? '♥' : '♡'}
      </button>
    ` : '';

    const playOrderCardHtml = (isLoggedIn() && showOnlyFavorites) ? `
      <button class="btn btn-secondary play-order-card-btn" onclick="addToPlayOrder(${game.id})" ${userPlayOrder.includes(game.id) ? 'disabled' : ''} title="Añadir a orden de juego">
        ${userPlayOrder.includes(game.id) ? 'En orden' : 'Jugar después'}
      </button>
    ` : '';

    const rateGameHtml = canVote() ? `
      <div class="rate-game">
        <input type="text" placeholder="Tu nombre" aria-label="Tu nombre" id="rate-author-${game.id}" maxlength="50" value="${authorName}" ${authorReadonly}>
        <input type="number" min="1" max="10" placeholder="1-10" aria-label="Puntuación" id="rate-input-${game.id}">
        <button class="btn btn-primary" onclick="submitRating(${game.id})">Votar</button>
      </div>
    ` : '';

    const addReviewHtml = canReview() ? `
      <div class="add-review" id="add-review-${game.id}" style="display:none;">
        <input type="text" id="review-author-${game.id}" placeholder="Tu nombre" maxlength="50" value="${authorName}" ${authorReadonly}>
        <textarea id="review-content-${game.id}" placeholder="Escribe tu reseña..." maxlength="1000"></textarea>
        <button class="btn btn-primary" onclick="submitReview(${game.id})">Enviar reseña</button>
      </div>
    ` : '';

    card.innerHTML = `
      <div class="game-header">
        <h2 class="game-title">${escapeHtml(game.name)}</h2>
        <div class="game-header-actions">
          <span class="game-console">${escapeHtml(game.console)}</span>
          ${favoriteHtml}
          ${playOrderCardHtml}
        </div>
      </div>
      <div class="game-genre">${escapeHtml(game.genre)}</div>
      <div class="game-rating">
        ${scoreDisplay}
        <span class="rating-count">${game.ratingCount} voto${game.ratingCount !== 1 ? 's' : ''}</span>
      </div>
      ${votersDisplay}
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

    grid.appendChild(card);
  }
}

async function toggleReviews(gameId, button) {
  const list = document.getElementById(`reviews-${gameId}`);
  const form = document.getElementById(`add-review-${gameId}`);

  if (list.style.display === 'none') {
    list.style.display = 'flex';
    if (form) form.style.display = 'flex';
    button.textContent = 'Ocultar';
    await loadReviews(gameId);
  } else {
    list.style.display = 'none';
    if (form) form.style.display = 'none';
    button.textContent = 'Ver';
  }
}

async function loadReviews(gameId) {
  const list = document.getElementById(`reviews-${gameId}`);
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
      const positiveClass = review.user_positive ? 'btn-success active' : 'btn-success';
      const negativeClass = review.user_negative ? 'btn-danger active' : 'btn-danger';
      const el = document.createElement('div');
      el.className = 'review';
      el.innerHTML = `
        <div class="review-author">${escapeHtml(review.author)}</div>
        <p class="review-content">${escapeHtml(review.content)}</p>
        <div class="review-actions">
          <button class="btn ${positiveClass}" onclick="voteReview(${review.id}, 'positive')">👍 ${review.positives}</button>
          <button class="btn ${negativeClass}" onclick="voteReview(${review.id}, 'negative')">👎 ${review.negatives}</button>
        </div>
      `;
      list.appendChild(el);
    }
  } catch (err) {
    list.innerHTML = `<div class="error">Error cargando reseñas: ${escapeHtml(err.message)}</div>`;
  }
}

async function submitRating(gameId) {
  if (!canVote()) {
    alert('Los invitados no pueden votar. Inicia sesión con una cuenta de usuario.');
    return;
  }
  const authorInput = document.getElementById(`rate-author-${gameId}`);
  const scoreInput = document.getElementById(`rate-input-${gameId}`);
  const author = currentUser ? currentUser.display_name : authorInput.value.trim();
  const score = parseInt(scoreInput.value, 10);

  if (!author) {
    alert('Escribe tu nombre para votar.');
    return;
  }

  if (Number.isNaN(score) || score < 1 || score > 10) {
    alert('La puntuación debe ser un número entre 1 y 10.');
    return;
  }

  try {
    await turso.execute('INSERT INTO ratings (game_id, author, score) VALUES (?, ?, ?)', [gameId, author, score]);
    if (!currentUser) authorInput.value = '';
    scoreInput.value = '';
    await loadGames();
  } catch (err) {
    alert('Error al votar: ' + err.message);
  }
}

async function submitReview(gameId) {
  if (!canReview()) {
    alert('Los invitados no pueden escribir reseñas. Inicia sesión con una cuenta de usuario.');
    return;
  }
  const authorInput = document.getElementById(`review-author-${gameId}`);
  const contentInput = document.getElementById(`review-content-${gameId}`);
  const author = currentUser ? currentUser.display_name : authorInput.value.trim();
  const content = contentInput.value.trim();

  if (!author || !content) {
    alert('Completa tu nombre y la reseña.');
    return;
  }

  try {
    await turso.execute('INSERT INTO reviews (game_id, author, content) VALUES (?, ?, ?)', [gameId, author, content]);
    if (!currentUser) authorInput.value = '';
    contentInput.value = '';
    await loadReviews(gameId);
    await loadGames();
  } catch (err) {
    alert('Error al enviar reseña: ' + err.message);
  }
}

async function voteReview(reviewId, voteType) {
  if (!canReview()) {
    alert('Los invitados no pueden votar reseñas. Inicia sesión con una cuenta de usuario.');
    return;
  }
  const voter = currentUser.username;
  try {
    const { rows } = await turso.execute(
      'SELECT vote_type FROM review_votes WHERE review_id = ? AND voter = ?',
      [reviewId, voter]
    );

    if (rows.length === 0) {
      await turso.execute(
        'INSERT INTO review_votes (review_id, vote_type, voter) VALUES (?, ?, ?)',
        [reviewId, voteType, voter]
      );
    } else if (rows[0].vote_type === voteType) {
      await turso.execute(
        'DELETE FROM review_votes WHERE review_id = ? AND voter = ?',
        [reviewId, voter]
      );
    } else {
      await turso.execute(
        'UPDATE review_votes SET vote_type = ? WHERE review_id = ? AND voter = ?',
        [voteType, reviewId, voter]
      );
    }

    // Find the game id by walking up to the review list element
    const reviewEl = document.querySelector(`.review button[onclick*="voteReview(${reviewId},"]`);
    if (reviewEl) {
      const list = reviewEl.closest('.review-list');
      const gameId = parseInt(list.id.replace('reviews-', ''), 10);
      await loadReviews(gameId);
    }
  } catch (err) {
    alert('Error al votar: ' + err.message);
  }
}

function isTursoUniqueError(err) {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('unique constraint failed');
}

async function toggleFavorite(gameId) {
  if (!isLoggedIn()) {
    alert('Inicia sesión para guardar favoritos.');
    return;
  }
  gameId = Number(gameId);
  if (processingFavorites.has(gameId)) return;
  processingFavorites.add(gameId);

  const isFavorite = userFavorites.has(gameId);
  try {
    if (isFavorite) {
      await turso.execute('DELETE FROM favorites WHERE user_id = ? AND game_id = ?', [currentUser.id, gameId]);
      userFavorites.delete(gameId);
    } else {
      await turso.execute('INSERT INTO favorites (user_id, game_id) VALUES (?, ?)', [currentUser.id, gameId]);
      userFavorites.add(gameId);
    }
    updateFavoriteButton(gameId);
    refreshListsUI();
  } catch (err) {
    if (!isFavorite && isTursoUniqueError(err)) {
      // Already favorited in DB but local state was stale; resync.
      userFavorites.add(gameId);
      updateFavoriteButton(gameId);
      refreshListsUI();
    } else {
      alert('Error al actualizar favoritos: ' + err.message);
    }
  } finally {
    processingFavorites.delete(gameId);
  }
}

async function addToPlayOrder(gameId) {
  if (!isLoggedIn()) {
    alert('Inicia sesión para usar el orden de juego.');
    return;
  }
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  if (userPlayOrder.includes(gameId)) {
    processingPlayOrder.delete(gameId);
    return;
  }
  const newOrder = userPlayOrder.length;
  try {
    await turso.execute('INSERT INTO play_orders (user_id, game_id, sort_order) VALUES (?, ?, ?)', [currentUser.id, gameId, newOrder]);
    userPlayOrder.push(gameId);
    refreshListsUI();
  } catch (err) {
    if (isTursoUniqueError(err)) {
      // Already in DB but stale locally; resync.
      if (!userPlayOrder.includes(gameId)) userPlayOrder.push(gameId);
      refreshListsUI();
    } else {
      alert('Error al agregar a orden de juego: ' + err.message);
    }
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

async function removeFromPlayOrder(gameId) {
  if (!isLoggedIn()) return;
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  try {
    await turso.execute('DELETE FROM play_orders WHERE user_id = ? AND game_id = ?', [currentUser.id, gameId]);
    userPlayOrder = userPlayOrder.filter(id => id !== gameId);
    await savePlayOrder();
    refreshListsUI();
  } catch (err) {
    alert('Error al quitar de orden de juego: ' + err.message);
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

async function movePlayOrder(gameId, direction) {
  if (!isLoggedIn()) return;
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
  [userPlayOrder[idx], userPlayOrder[newIdx]] = [userPlayOrder[newIdx], userPlayOrder[idx]];
  try {
    await savePlayOrder();
    refreshListsUI();
  } catch (err) {
    alert('Error al reordenar: ' + err.message);
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

async function savePlayOrder() {
  if (!isLoggedIn()) return;
  for (let i = 0; i < userPlayOrder.length; i++) {
    await turso.execute('UPDATE play_orders SET sort_order = ? WHERE user_id = ? AND game_id = ?', [i, currentUser.id, userPlayOrder[i]]);
  }
}

async function setPlayOrderRank(gameId, newRank) {
  if (!isLoggedIn()) return;
  if (processingPlayOrder.has(gameId)) return;
  processingPlayOrder.add(gameId);

  const currentIdx = userPlayOrder.indexOf(gameId);
  if (currentIdx === -1) {
    processingPlayOrder.delete(gameId);
    return;
  }
  const maxRank = userPlayOrder.length - 1;
  if (newRank < 0) newRank = 0;
  if (newRank > maxRank) newRank = maxRank;
  if (newRank === currentIdx) {
    processingPlayOrder.delete(gameId);
    return;
  }

  userPlayOrder.splice(currentIdx, 1);
  userPlayOrder.splice(newRank, 0, gameId);
  try {
    await savePlayOrder();
    renderPlayOrderList();
  } catch (err) {
    alert('Error al reordenar: ' + err.message);
  } finally {
    processingPlayOrder.delete(gameId);
  }
}

function refreshListsUI() {
  applyFilters();
  if (playOrderModal.style.display === 'flex') renderPlayOrderList();
}

function updateFavoriteButton(gameId) {
  const card = grid.querySelector(`.game-card[data-id="${gameId}"]`);
  if (!card) return;
  const btn = card.querySelector('.favorite-btn');
  if (!btn) return;
  const isFavorite = userFavorites.has(gameId);
  btn.classList.toggle('active', isFavorite);
  btn.textContent = isFavorite ? '♥' : '♡';
}

function updateFavoritesButtonState() {
  favoritesBtn.classList.toggle('active', showOnlyFavorites);
  favoritesBtn.setAttribute('aria-pressed', String(showOnlyFavorites));
}

function toggleFavoritesFilter() {
  if (!isLoggedIn()) {
    alert('Inicia sesión para ver tus favoritos.');
    return;
  }
  showOnlyFavorites = !showOnlyFavorites;
  updateFavoritesButtonState();
  applyFilters();
}

function openPlayOrderModal() {
  if (!isLoggedIn()) {
    alert('Inicia sesión para ver tu orden de juego.');
    return;
  }
  document.getElementById('play-order-modal').style.display = 'flex';
  renderPlayOrderList();
}

function closePlayOrderModal() {
  document.getElementById('play-order-modal').style.display = 'none';
}

function getDragTargetRank(list, clientY, draggedId) {
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

function renderPlayOrderList() {
  const list = document.getElementById('play-order-list');
  const orderedGames = userPlayOrder.map(id => allGames.find(g => g.id === id)).filter(Boolean);
  if (orderedGames.length === 0) {
    list.innerHTML = '<div class="empty-state">No tienes juegos en tu orden de juego.</div>';
    return;
  }
  list.innerHTML = '';
  for (let i = 0; i < orderedGames.length; i++) {
    const game = orderedGames[i];
    const el = document.createElement('div');
    el.className = 'list-modal-item play-order-item';
    el.dataset.gameId = game.id;
    el.innerHTML = `
      <span class="drag-handle" title="Arrastrar para reordenar" draggable="true">⋮⋮</span>
      <input type="number" class="play-order-rank" min="1" max="${orderedGames.length}" value="${i + 1}" aria-label="Posición">
      <div class="list-modal-item-info">
        <strong>${escapeHtml(game.name)}</strong>
        <span>${escapeHtml(game.console)} · ${escapeHtml(game.genre)}</span>
      </div>
      <div class="list-modal-item-actions">
        <button class="btn btn-secondary" onclick="movePlayOrder(${game.id}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn btn-secondary" onclick="movePlayOrder(${game.id}, 1)" ${i === orderedGames.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn btn-danger" onclick="removeFromPlayOrder(${game.id})">Quitar</button>
      </div>
    `;

    const input = el.querySelector('.play-order-rank');
    input.addEventListener('change', () => {
      const rank = parseInt(input.value, 10);
      if (!Number.isFinite(rank)) return;
      setPlayOrderRank(game.id, rank - 1);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
    });

    const dragHandle = el.querySelector('.drag-handle');
    dragHandle.addEventListener('dragstart', e => {
      draggedPlayOrderId = game.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(game.id));
      try {
        e.dataTransfer.setDragImage(el, 0, 0);
      } catch (_) {}
      el.classList.add('dragging');
    });

    dragHandle.addEventListener('dragend', () => {
      draggedPlayOrderId = null;
      el.classList.remove('dragging');
      list.querySelectorAll('.play-order-item').forEach(item => item.classList.remove('drag-over'));
    });

    list.appendChild(el);
  }
}

// Event listeners
[filterName, filterConsole, filterRank, filterReviews, sortBy].forEach(el => {
  el.addEventListener('input', applyFilters);
});

refreshBtn.addEventListener('click', loadGames);

// Admin CRUD
const adminModal = document.getElementById('admin-modal');
const adminBtn = document.getElementById('admin-btn');
const closeAdminBtn = document.getElementById('close-admin');
const adminForm = document.getElementById('admin-game-form');
const adminSubmitBtn = document.getElementById('admin-submit-btn');
const adminCancelBtn = document.getElementById('admin-cancel-btn');
const adminGameId = document.getElementById('admin-game-id');
const adminGameName = document.getElementById('admin-game-name');
const adminGameConsole = document.getElementById('admin-game-console');
const adminGameGenre = document.getElementById('admin-game-genre');
const adminConsolesList = document.getElementById('admin-consoles-list');
const adminSearch = document.getElementById('admin-search');
const adminGamesTableBody = document.querySelector('#admin-games-table tbody');

// Edit modal
const editModal = document.getElementById('edit-modal');
const closeEditBtn = document.getElementById('close-edit');
const editForm = document.getElementById('edit-game-form');
const editGameId = document.getElementById('edit-game-id');
const editGameName = document.getElementById('edit-game-name');
const editGameConsole = document.getElementById('edit-game-console');
const editGameGenre = document.getElementById('edit-game-genre');
const editConsolesList = document.getElementById('edit-consoles-list');
const editRatingsList = document.getElementById('edit-ratings-list');
const editReviewsList = document.getElementById('edit-reviews-list');

// Auth UI
const authLoggedOut = document.getElementById('auth-logged-out');
const authLoggedIn = document.getElementById('auth-logged-in');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const guestBtn = document.getElementById('guest-btn');
const authUserName = document.getElementById('auth-user-name');
const accountBtn = document.getElementById('account-btn');
const logoutBtn = document.getElementById('logout-btn');

// Account modal
const accountModal = document.getElementById('account-modal');
const closeAccountBtn = document.getElementById('close-account');
const accountForm = document.getElementById('account-form');
const accountDisplayName = document.getElementById('account-display-name');
const accountNewPassword = document.getElementById('account-new-password');
const accountConfirmPassword = document.getElementById('account-confirm-password');

// User management modal
const userModal = document.getElementById('user-modal');
const userModalTitle = document.getElementById('user-modal-title');
const closeUserBtn = document.getElementById('close-user');
const userForm = document.getElementById('user-form');
const userFormId = document.getElementById('user-form-id');
const userFormUsername = document.getElementById('user-form-username');
const userFormDisplayName = document.getElementById('user-form-display-name');
const userFormRole = document.getElementById('user-form-role');
const userFormPasswordGroup = document.getElementById('user-form-password-group');
const userFormPassword = document.getElementById('user-form-password');
const userFormSubmit = document.getElementById('user-form-submit');
const userFormCancel = document.getElementById('user-form-cancel');
const adminUsersSection = document.getElementById('admin-users-section');
const adminTabs = document.querySelectorAll('.admin-tab');
const adminTabPanels = document.querySelectorAll('.admin-tab-panel');
const adminNewUserBtn = document.getElementById('admin-new-user-btn');
const adminUsersTableBody = document.querySelector('#admin-users-table tbody');

// Favorites and play order
const favoritesBtn = document.getElementById('favorites-btn');
const playOrderBtn = document.getElementById('play-order-btn');
const playOrderModal = document.getElementById('play-order-modal');
const closePlayOrderBtn = document.getElementById('close-play-order');

function renderAuthUI() {
  if (!isLoggedIn()) {
    showOnlyFavorites = false;
  }

  if (currentUser) {
    authLoggedOut.style.display = 'none';
    authLoggedIn.style.display = 'flex';
    authUserName.textContent = `${escapeHtml(currentUser.display_name)} (${roleLabel(currentUser.role)})`;
    adminBtn.style.display = isAdmin() ? 'inline-block' : 'none';
    accountBtn.style.display = currentUser.role === 'guest' ? 'none' : 'inline-block';
    favoritesBtn.style.display = isLoggedIn() ? 'inline-block' : 'none';
    playOrderBtn.style.display = isLoggedIn() ? 'inline-block' : 'none';
  } else {
    authLoggedOut.style.display = 'flex';
    authLoggedIn.style.display = 'none';
    adminBtn.style.display = 'none';
    favoritesBtn.style.display = 'none';
    playOrderBtn.style.display = 'none';
  }
  updateFavoritesButtonState();
  updateMainVisibility();
}

function updateMainVisibility() {
  const mainSections = document.querySelectorAll('.filters, .status-bar, #games-grid');
  const loginRequired = document.getElementById('login-required');
  if (!loginRequired) return;
  if (currentUser) {
    mainSections.forEach(s => s.style.display = '');
    loginRequired.style.display = 'none';
  } else {
    mainSections.forEach(s => s.style.display = 'none');
    loginRequired.style.display = 'block';
  }
}

async function login() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) {
    alert('Introduce usuario y contraseña.');
    return;
  }
  try {
    const { rows } = await turso.execute('SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      alert('Usuario o contraseña incorrectos.');
      return;
    }
    const user = rows[0];
    const hash = await hashPassword(password);
    if (hash !== user.password_hash) {
      alert('Usuario o contraseña incorrectos.');
      return;
    }
    currentUser = { id: Number(user.id), username: user.username, display_name: user.display_name, role: user.role };
    saveCurrentUser();
    loginUsername.value = '';
    loginPassword.value = '';
    renderAuthUI();
    loadGames();
  } catch (err) {
    alert('Error al iniciar sesión: ' + err.message);
  }
}

function loginGuest() {
  currentUser = { id: null, username: 'guest', display_name: 'Invitado', role: 'guest' };
  saveCurrentUser();
  renderAuthUI();
  loadGames();
}

function logout() {
  clearCurrentUser();
  renderAuthUI();
  grid.innerHTML = '<div class="loading">Cargando juegos...</div>';
  countEl.textContent = 'Cargando...';
}

function openAccountModal() {
  if (!currentUser || currentUser.role === 'guest') return;
  accountDisplayName.value = currentUser.display_name;
  accountNewPassword.value = '';
  accountConfirmPassword.value = '';
  accountModal.style.display = 'flex';
}

function closeAccountModal() {
  accountModal.style.display = 'none';
}

async function saveAccount(event) {
  event.preventDefault();
  if (!currentUser || currentUser.role === 'guest') return;
  const displayName = accountDisplayName.value.trim();
  const newPassword = accountNewPassword.value;
  const confirmPassword = accountConfirmPassword.value;
  if (!displayName) {
    alert('El nombre visible no puede estar vacío.');
    return;
  }
  if (newPassword && newPassword !== confirmPassword) {
    alert('Las contraseñas no coinciden.');
    return;
  }
  try {
    let sql = 'UPDATE users SET display_name = ?';
    const args = [displayName];
    if (newPassword) {
      const hash = await hashPassword(newPassword);
      sql += ', password_hash = ?';
      args.push(hash);
    }
    sql += ' WHERE id = ?';
    args.push(currentUser.id);
    await turso.execute(sql, args);
    currentUser.display_name = displayName;
    saveCurrentUser();
    renderAuthUI();
    applyFilters();
    closeAccountModal();
    alert('Cambios guardados.');
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  }
}

async function loadUsers() {
  const { rows } = await turso.execute('SELECT id, username, display_name, role FROM users ORDER BY username');
  allUsers = rows;
}

function renderAdminUsers() {
  adminUsersTableBody.innerHTML = '';
  for (const user of allUsers) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>${escapeHtml(user.display_name)}</td>
      <td>${roleLabel(user.role)}</td>
      <td>
        <button class="btn btn-primary admin-user-edit-btn" data-id="${user.id}">Editar</button>
        <button class="btn btn-secondary admin-user-password-btn" data-id="${user.id}">Cambiar pass</button>
        <button class="btn btn-danger admin-user-delete-btn" data-id="${user.id}">Eliminar</button>
      </td>
    `;
    tr.querySelector('.admin-user-edit-btn').addEventListener('click', () => openUserModal(user.id));
    tr.querySelector('.admin-user-password-btn').addEventListener('click', () => openUserPasswordModal(user.id));
    tr.querySelector('.admin-user-delete-btn').addEventListener('click', () => deleteUser(user.id));
    adminUsersTableBody.appendChild(tr);
  }
}

function openUserModal(userId) {
  userForm.reset();
  userFormId.value = '';
  userFormUsername.required = true;
  userFormUsername.disabled = false;
  userFormDisplayName.disabled = false;
  userFormRole.disabled = false;
  userFormPasswordGroup.style.display = 'block';
  userFormPassword.required = true;
  userFormSubmit.textContent = 'Guardar';
  userModalTitle.textContent = 'Nuevo usuario';

  if (userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    userFormId.value = user.id;
    userFormUsername.value = user.username;
    userFormUsername.required = false;
    userFormUsername.disabled = true;
    userFormDisplayName.value = user.display_name;
    userFormRole.value = user.role;
    userFormPasswordGroup.style.display = 'none';
    userFormPassword.required = false;
    userFormSubmit.textContent = 'Guardar cambios';
    userModalTitle.textContent = 'Editar usuario';
  }
  userModal.style.display = 'flex';
}

function openUserPasswordModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;
  userForm.reset();
  userFormId.value = user.id;
  userFormUsername.value = user.username;
  userFormUsername.disabled = true;
  userFormDisplayName.value = user.display_name;
  userFormDisplayName.disabled = true;
  userFormRole.value = user.role;
  userFormRole.disabled = true;
  userFormPasswordGroup.style.display = 'block';
  userFormPassword.required = true;
  userFormSubmit.textContent = 'Cambiar contraseña';
  userModalTitle.textContent = `Cambiar contraseña de ${user.username}`;
  userModal.style.display = 'flex';
}

function closeUserModal() {
  userModal.style.display = 'none';
  userForm.reset();
  userFormUsername.disabled = false;
  userFormDisplayName.disabled = false;
  userFormRole.disabled = false;
}

async function saveUser(event) {
  event.preventDefault();
  if (!isAdmin()) {
    alert('No tienes permisos.');
    return;
  }
  const id = userFormId.value;
  const username = userFormUsername.value.trim();
  const displayName = userFormDisplayName.value.trim();
  const role = userFormRole.value;
  const password = userFormPassword.value;

  if (!displayName || !role) {
    alert('Completa los campos requeridos.');
    return;
  }

  try {
    if (!id) {
      if (!username || !password) {
        alert('Usuario y contraseña requeridos.');
        return;
      }
      const hash = await hashPassword(password);
      await turso.execute(
        'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
        [username, hash, displayName, role]
      );
    } else if (userFormSubmit.textContent === 'Cambiar contraseña') {
      if (!password) {
        alert('Introduce una contraseña.');
        return;
      }
      const hash = await hashPassword(password);
      await turso.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    } else {
      await turso.execute('UPDATE users SET display_name = ?, role = ? WHERE id = ?', [displayName, role, id]);
      if (currentUser.id === parseInt(id, 10)) {
        currentUser.display_name = displayName;
        currentUser.role = role;
        saveCurrentUser();
        renderAuthUI();
        applyFilters();
      }
    }
    await loadUsers();
    renderAdminUsers();
    closeUserModal();
  } catch (err) {
    alert('Error al guardar usuario: ' + err.message);
  }
}

async function deleteUser(userId) {
  if (!isAdmin()) return;
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;
  if (user.id === currentUser?.id) {
    alert('No puedes eliminarte a ti mismo.');
    return;
  }
  if (!confirm(`¿Eliminar usuario "${user.username}"?`)) return;
  try {
    await turso.execute('DELETE FROM users WHERE id = ?', [userId]);
    await loadUsers();
    renderAdminUsers();
  } catch (err) {
    alert('Error al eliminar usuario: ' + err.message);
  }
}

function switchAdminTab(tabName) {
  adminTabs.forEach(tab => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  adminTabPanels.forEach(panel => {
    const active = panel.dataset.panel === tabName;
    panel.classList.toggle('active', active);
    panel.style.display = active ? 'block' : 'none';
  });
}

function openAdminModal() {
  if (!isAdmin()) {
    alert('No tienes permisos de administración. Inicia sesión como administrador.');
    return;
  }
  adminModal.style.display = 'flex';
  switchAdminTab('add');
  renderAdminConsolesList();
  renderAdminGames();
  loadUsers().then(renderAdminUsers).catch(err => {
    console.error('Error loading users:', err);
  });
}

function closeAdminModal() {
  adminModal.style.display = 'none';
  resetAdminForm();
}

function renderAdminConsolesList() {
  adminConsolesList.innerHTML = '';
  for (const c of consoles) {
    const option = document.createElement('option');
    option.value = c;
    adminConsolesList.appendChild(option);
  }
}

function resetAdminForm() {
  adminForm.reset();
  adminGameId.value = '';
  adminSubmitBtn.textContent = 'Guardar';
}

function renderAdminGames() {
  const query = adminSearch.value.trim().toLowerCase();
  const filtered = allGames
    .filter(g => g.name.toLowerCase().includes(query) || g.console.toLowerCase().includes(query) || g.genre.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  adminGamesTableBody.innerHTML = '';
  for (const game of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${game.id}</td>
      <td>${escapeHtml(game.name)}</td>
      <td>${escapeHtml(game.console)}</td>
      <td>${escapeHtml(game.genre)}</td>
      <td>
        <button class="btn btn-primary admin-edit-btn" data-id="${game.id}">Editar</button>
        <button class="btn btn-danger admin-delete-btn" data-id="${game.id}">Eliminar</button>
      </td>
    `;
    tr.querySelector('.admin-edit-btn').addEventListener('click', () => openEditModal(game.id));
    tr.querySelector('.admin-delete-btn').addEventListener('click', () => deleteGame(game.id));
    adminGamesTableBody.appendChild(tr);
  }
}

function openEditModal(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  editGameId.value = game.id;
  editGameName.value = game.name;
  editGameConsole.value = game.console;
  editGameGenre.value = game.genre;

  editConsolesList.innerHTML = '';
  for (const c of consoles) {
    const option = document.createElement('option');
    option.value = c;
    editConsolesList.appendChild(option);
  }

  editModal.style.display = 'flex';
  loadEditRatings(gameId);
  loadEditReviews(gameId);
}

function closeEditModal() {
  editModal.style.display = 'none';
  editForm.reset();
  editGameId.value = '';
  editRatingsList.innerHTML = '';
  editReviewsList.innerHTML = '';
}

async function loadEditRatings(gameId) {
  editRatingsList.innerHTML = '<div class="loading" style="padding:1rem;">Cargando votos...</div>';
  try {
    const { rows } = await turso.execute('SELECT id, author, score FROM ratings WHERE game_id = ? ORDER BY created_at DESC', [gameId]);
    if (rows.length === 0) {
      editRatingsList.innerHTML = '<div class="empty-state" style="padding:1rem;">No hay votos.</div>';
      return;
    }
    editRatingsList.innerHTML = '';
    for (const r of rows) {
      const el = document.createElement('div');
      el.className = 'edit-list-item';
      el.innerHTML = `
        <input type="text" id="edit-rating-author-${r.id}" value="${escapeHtml(r.author)}" placeholder="Autor" maxlength="50">
        <input type="number" id="edit-rating-score-${r.id}" value="${r.score}" min="1" max="10" placeholder="1-10">
        <div class="edit-list-actions">
          <button class="btn btn-primary edit-rating-save" data-id="${r.id}">Guardar</button>
          <button class="btn btn-danger edit-rating-delete" data-id="${r.id}">Eliminar</button>
        </div>
      `;
      el.querySelector('.edit-rating-save').addEventListener('click', () => saveEditRating(r.id));
      el.querySelector('.edit-rating-delete').addEventListener('click', () => deleteEditRating(r.id));
      editRatingsList.appendChild(el);
    }
  } catch (err) {
    editRatingsList.innerHTML = `<div class="error">Error cargando votos: ${escapeHtml(err.message)}</div>`;
  }
}

async function saveEditRating(ratingId) {
  const author = document.getElementById(`edit-rating-author-${ratingId}`).value.trim();
  const score = parseInt(document.getElementById(`edit-rating-score-${ratingId}`).value, 10);
  if (!author || Number.isNaN(score) || score < 1 || score > 10) {
    alert('Completa autor y puntuación (1-10).');
    return;
  }
  try {
    await turso.execute('UPDATE ratings SET author = ?, score = ? WHERE id = ?', [author, score, ratingId]);
    await loadGames();
  } catch (err) {
    alert('Error al guardar voto: ' + err.message);
  }
}

async function deleteEditRating(ratingId) {
  if (!confirm('¿Eliminar este voto?')) return;
  try {
    await turso.execute('DELETE FROM ratings WHERE id = ?', [ratingId]);
    const gameId = parseInt(editGameId.value, 10);
    await loadGames();
    loadEditRatings(gameId);
  } catch (err) {
    alert('Error al eliminar voto: ' + err.message);
  }
}

async function loadEditReviews(gameId) {
  editReviewsList.innerHTML = '<div class="loading" style="padding:1rem;">Cargando reseñas...</div>';
  try {
    const { rows } = await turso.execute(`
      SELECT
        rv.id,
        rv.author,
        rv.content,
        COALESCE(SUM(CASE WHEN v.vote_type = 'positive' THEN 1 ELSE 0 END), 0) AS positives,
        COALESCE(SUM(CASE WHEN v.vote_type = 'negative' THEN 1 ELSE 0 END), 0) AS negatives
      FROM reviews rv
      LEFT JOIN review_votes v ON v.review_id = rv.id
      WHERE rv.game_id = ?
      GROUP BY rv.id, rv.author, rv.content
      ORDER BY rv.created_at DESC
    `, [gameId]);
    if (rows.length === 0) {
      editReviewsList.innerHTML = '<div class="empty-state" style="padding:1rem;">No hay reseñas.</div>';
      return;
    }
    editReviewsList.innerHTML = '';
    for (const r of rows) {
      const el = document.createElement('div');
      el.className = 'edit-list-item edit-review-item';
      el.innerHTML = `
        <input type="text" id="edit-review-author-${r.id}" value="${escapeHtml(r.author)}" placeholder="Autor" maxlength="50">
        <textarea id="edit-review-content-${r.id}" placeholder="Reseña..." maxlength="1000">${escapeHtml(r.content)}</textarea>
        <div class="review-votes-count">👍 ${r.positives} &nbsp; 👎 ${r.negatives}</div>
        <div class="edit-list-actions">
          <button class="btn btn-primary edit-review-save" data-id="${r.id}">Guardar</button>
          <button class="btn btn-danger edit-review-delete" data-id="${r.id}">Eliminar</button>
        </div>
      `;
      el.querySelector('.edit-review-save').addEventListener('click', () => saveEditReview(r.id));
      el.querySelector('.edit-review-delete').addEventListener('click', () => deleteEditReview(r.id));
      editReviewsList.appendChild(el);
    }
  } catch (err) {
    editReviewsList.innerHTML = `<div class="error">Error cargando reseñas: ${escapeHtml(err.message)}</div>`;
  }
}

async function saveEditReview(reviewId) {
  const author = document.getElementById(`edit-review-author-${reviewId}`).value.trim();
  const content = document.getElementById(`edit-review-content-${reviewId}`).value.trim();
  if (!author || !content) {
    alert('Completa autor y contenido de la reseña.');
    return;
  }
  try {
    await turso.execute('UPDATE reviews SET author = ?, content = ? WHERE id = ?', [author, content, reviewId]);
    const gameId = parseInt(editGameId.value, 10);
    await loadGames();
    loadEditReviews(gameId);
  } catch (err) {
    alert('Error al guardar reseña: ' + err.message);
  }
}

async function deleteEditReview(reviewId) {
  if (!confirm('¿Eliminar esta reseña y sus votos?')) return;
  try {
    await turso.execute('DELETE FROM review_votes WHERE review_id = ?', [reviewId]);
    await turso.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
    const gameId = parseInt(editGameId.value, 10);
    await loadGames();
    loadEditReviews(gameId);
  } catch (err) {
    alert('Error al eliminar reseña: ' + err.message);
  }
}

async function saveEditGame(event) {
  event.preventDefault();
  const id = editGameId.value;
  const name = editGameName.value.trim();
  const consoleName = editGameConsole.value.trim();
  const genre = editGameGenre.value.trim();
  if (!name || !consoleName || !genre) {
    alert('Completa todos los campos.');
    return;
  }
  try {
    await turso.execute(
      'UPDATE games SET name = ?, console = ?, genre = ? WHERE id = ?',
      [name, consoleName, genre, parseInt(id, 10)]
    );
    await loadGames();
    renderAdminGames();
    closeEditModal();
  } catch (err) {
    alert('Error al guardar juego: ' + err.message);
  }
}

async function deleteGame(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;
  if (!confirm(`¿Eliminar "${game.name}"? Se borrarán también sus rankings, reseñas y votos.`)) return;

  try {
    await turso.execute('DELETE FROM review_votes WHERE review_id IN (SELECT id FROM reviews WHERE game_id = ?)', [gameId]);
    await turso.execute('DELETE FROM reviews WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM ratings WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM favorites WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM play_orders WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM games WHERE id = ?', [gameId]);
    await loadGames();
    renderAdminGames();
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}

async function saveAdminGame(event) {
  event.preventDefault();
  const name = adminGameName.value.trim();
  const consoleName = adminGameConsole.value.trim();
  const genre = adminGameGenre.value.trim();
  const id = adminGameId.value;

  if (!name || !consoleName || !genre) {
    alert('Completa todos los campos.');
    return;
  }

  try {
    if (id) {
      await turso.execute(
        'UPDATE games SET name = ?, console = ?, genre = ? WHERE id = ?',
        [name, consoleName, genre, parseInt(id, 10)]
      );
    } else {
      await turso.execute(
        'INSERT INTO games (name, console, genre) VALUES (?, ?, ?)',
        [name, consoleName, genre]
      );
    }
    resetAdminForm();
    await loadGames();
    renderAdminGames();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  }
}

adminTabs.forEach(tab => {
  tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab));
});

adminBtn.addEventListener('click', openAdminModal);
closeAdminBtn.addEventListener('click', closeAdminModal);
adminModal.querySelector('.modal-backdrop').addEventListener('click', closeAdminModal);
adminForm.addEventListener('submit', saveAdminGame);
adminCancelBtn.addEventListener('click', resetAdminForm);
adminSearch.addEventListener('input', renderAdminGames);

closeEditBtn.addEventListener('click', closeEditModal);
editModal.querySelector('.modal-backdrop').addEventListener('click', closeEditModal);
editForm.addEventListener('submit', saveEditGame);

// Auth event listeners
loginBtn.addEventListener('click', login);
guestBtn.addEventListener('click', loginGuest);
logoutBtn.addEventListener('click', logout);
accountBtn.addEventListener('click', openAccountModal);
closeAccountBtn.addEventListener('click', closeAccountModal);
accountModal.querySelector('.modal-backdrop').addEventListener('click', closeAccountModal);
accountForm.addEventListener('submit', saveAccount);
loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
loginUsername.addEventListener('keydown', e => { if (e.key === 'Enter') loginPassword.focus(); });

adminNewUserBtn.addEventListener('click', () => openUserModal(null));
closeUserBtn.addEventListener('click', closeUserModal);
userModal.querySelector('.modal-backdrop').addEventListener('click', closeUserModal);
userForm.addEventListener('submit', saveUser);
userFormCancel.addEventListener('click', closeUserModal);

favoritesBtn.addEventListener('click', toggleFavoritesFilter);
playOrderBtn.addEventListener('click', openPlayOrderModal);
closePlayOrderBtn.addEventListener('click', closePlayOrderModal);
playOrderModal.querySelector('.modal-backdrop').addEventListener('click', closePlayOrderModal);

const playOrderListEl = document.getElementById('play-order-list');
playOrderListEl.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (!draggedPlayOrderId) return;
  const items = [...playOrderListEl.querySelectorAll('.play-order-item')];
  items.forEach(item => item.classList.remove('drag-over'));
  const targetRank = getDragTargetRank(playOrderListEl, e.clientY, draggedPlayOrderId);
  const target = items.find(item => parseInt(item.dataset.gameId, 10) !== draggedPlayOrderId && getDragTargetRank(playOrderListEl, item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2, draggedPlayOrderId) === targetRank);
  if (target) target.classList.add('drag-over');
});
playOrderListEl.addEventListener('dragleave', e => {
  if (!playOrderListEl.contains(e.relatedTarget)) {
    playOrderListEl.querySelectorAll('.play-order-item').forEach(item => item.classList.remove('drag-over'));
  }
});
playOrderListEl.addEventListener('drop', e => {
  e.preventDefault();
  const data = e.dataTransfer.getData('text/plain');
  const gameId = parseInt(data, 10);
  if (!Number.isFinite(gameId)) return;
  const newRank = getDragTargetRank(playOrderListEl, e.clientY, gameId);
  setPlayOrderRank(gameId, newRank);
});

// Expose functions for inline onclick handlers on game cards
window.submitRating = submitRating;
window.submitReview = submitReview;
window.voteReview = voteReview;
window.toggleReviews = toggleReviews;
window.deleteGame = deleteGame;
window.openEditModal = openEditModal;
window.openUserModal = openUserModal;
window.toggleFavorite = toggleFavorite;
window.addToPlayOrder = addToPlayOrder;
window.removeFromPlayOrder = removeFromPlayOrder;
window.movePlayOrder = movePlayOrder;
window.setPlayOrderRank = setPlayOrderRank;

// Initial load
loadCurrentUser();
renderAuthUI();
if (currentUser) loadGames();
