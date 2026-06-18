// @ts-check

import { turso } from './turso-client.js';
import {
  adminForm,
  adminGameConsole,
  adminGameGenre,
  adminGameGenreSelect,
  adminGameId,
  adminGameName,
  adminGamesTableBody,
  adminGenresList,
  adminGenresSearch,
  adminGenresCount,
  adminModal,
  adminNewGenreName,
  adminFilterConsole,
  adminFilterGenre,
  adminSearch,
  adminSubmitBtn,
  adminTabs,
  adminTabPanels,
  adminUsersTableBody,
  editForm,
  editGameConsole,
  editGameGenre,
  editGameGenreSelect,
  editGameId,
  editGameName,
  editModal,
  editRatingsList,
  editReviewsList,
  userForm,
  userFormDisplayName,
  userFormId,
  userFormPassword,
  userFormPasswordGroup,
  userFormRole,
  userFormSubmit,
  userFormUsername,
  userModal,
  userModalTitle,
} from './elements.js';
import {
  allGames,
  allUsers,
  currentUser,
  isAdmin,
  setAllUsers,
  setCurrentUser,
} from './state.js';
import { escapeHtml } from './utils.js';
import { adminGameRow, adminUserRow, editRatingItem, editReviewItem } from './templates.js';
import { hashPassword } from './utils.js';
import { loadGames, applyFilters } from './games.js';
import { saveCurrentUser, renderAuthUI } from './auth.js';
import { loadSuggestions, renderAdminSuggestions } from './suggestions.js';
import { GenreSelect } from './genre-select.js';

/** @type {string[]} */
let adminGenres = [];

/** @type {GenreSelect|null} */
let adminGenreSelect = null;

/** @type {GenreSelect|null} */
let editGenreSelect = null;

/**
 * Switch visible admin tab.
 * @param {string} tabName
 */
export function switchAdminTab(tabName) {
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

  if (tabName === 'genres') {
    if (adminGenresSearch) adminGenresSearch.value = '';
    renderAdminGenres();
  }
}

/**
 * Render the console dropdown in the admin form.
 */
export function renderAdminConsolesList() {
  if (!adminGameConsole) return;

  adminGameConsole.innerHTML = '<option value="" disabled selected>Seleccionar consola...</option>';
  for (const c of [...new Set(allGames.map(g => g.console))].sort()) {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    adminGameConsole.appendChild(option);
  }
}

/**
 * Reset the admin add/edit game form.
 */
export function resetAdminForm() {
  adminForm?.reset();
  if (adminGameId) adminGameId.value = '';
  if (adminSubmitBtn) adminSubmitBtn.textContent = 'Guardar';
  adminGenreSelect?.setValue('');
}

/**
 * Load the canonical genre list from Turso.
 */
export async function loadAdminGenres() {
  try {
    const { rows } = await turso.execute('SELECT name FROM genres ORDER BY name');
    adminGenres = rows.map(r => String(r.name));
  } catch (err) {
    console.error('Error loading genres:', err);
    adminGenres = [];
  }
}

/**
 * Initialize or refresh the genre selectors in the add/edit forms.
 */
export function initGenreSelectors() {
  if (adminGameGenreSelect && adminGameGenre) {
    adminGenreSelect = new GenreSelect(adminGameGenreSelect, adminGameGenre, adminGenres);
  }
  if (editGameGenreSelect && editGameGenre) {
    editGenreSelect = new GenreSelect(editGameGenreSelect, editGameGenre, adminGenres);
  }
}

/**
 * Render the genre management list.
 * @param {string} [filter] - Optional search filter.
 */
export function renderAdminGenres(filter = '') {
  if (!adminGenresList) return;

  if (adminGenres.length === 0) {
    adminGenresList.innerHTML = '<span class="genre-placeholder">No hay géneros registrados.</span>';
    if (adminGenresCount) adminGenresCount.textContent = '';
    return;
  }

  const term = filter.trim().toLowerCase();
  const filtered = term
    ? adminGenres.filter(g => g.toLowerCase().includes(term))
    : adminGenres;

  if (adminGenresCount) {
    const total = adminGenres.length;
    const showing = filtered.length;
    adminGenresCount.innerHTML = showing === total
      ? `<strong>${total}</strong> género${total !== 1 ? 's' : ''}`
      : `<strong>${showing}</strong> de ${total} género${total !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    adminGenresList.innerHTML = '<span class="genre-placeholder">Ningún género coincide con la búsqueda.</span>';
    return;
  }

  adminGenresList.innerHTML = filtered.map(genre => `
    <span class="genre-management-item">
      <span class="genre-name">${escapeHtml(genre)}</span>
      <button type="button" class="genre-delete-btn" data-genre="${escapeHtml(genre)}" aria-label="Eliminar ${escapeHtml(genre)}" title="Eliminar ${escapeHtml(genre)}">×</button>
    </span>
  `).join('');

  for (const btn of adminGenresList.querySelectorAll('.genre-delete-btn')) {
    btn.addEventListener('click', () => deleteGenre(btn.dataset.genre));
  }
}

/**
 * Add a new genre from the management panel.
 */
export async function addGenre() {
  const name = adminNewGenreName?.value.trim();
  if (!name) return;

  try {
    await turso.execute('INSERT INTO genres (name) VALUES (?)', [name]);
    adminNewGenreName.value = '';
    if (adminGenresSearch) adminGenresSearch.value = '';
    await loadAdminGenres();
    renderAdminGenres();
    adminGenreSelect?.setGenres(adminGenres);
    editGenreSelect?.setGenres(adminGenres);
  } catch (err) {
    alert('Error al agregar género: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Delete a genre from the management panel.
 * @param {string} name
 */
export async function deleteGenre(name) {
  if (!name) return;
  if (!confirm(`¿Eliminar el género "${name}"? Los juegos que lo usen lo conservarán hasta que se editen.`)) return;

  try {
    await turso.execute('DELETE FROM genres WHERE name = ?', [name]);
    await loadAdminGenres();
    renderAdminGenres();
    adminGenreSelect?.setGenres(adminGenres);
    editGenreSelect?.setGenres(adminGenres);
  } catch (err) {
    alert('Error al eliminar género: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Open the admin modal and load data.
 */
export async function openAdminModal() {
  if (!isAdmin()) {
    alert('No tienes permisos de administración. Inicia sesión como administrador.');
    return;
  }

  if (adminModal) adminModal.style.display = 'flex';
  switchAdminTab('add');
  renderAdminConsolesList();
  populateAdminListFilters();
  renderAdminGames();
  await loadAdminGenres();
  renderAdminGenres();
  initGenreSelectors();
  loadUsers().then(renderAdminUsers).catch(err => {
    console.error('Error loading users:', err);
  });
  loadSuggestions().then(renderAdminSuggestions).catch(err => {
    console.error('Error loading suggestions:', err);
  });
}

/**
 * Close the admin modal.
 */
export function closeAdminModal() {
  if (adminModal) adminModal.style.display = 'none';
  resetAdminForm();
}

/**
 * Populate the admin list filter dropdowns.
 */
export function populateAdminListFilters() {
  if (!adminFilterConsole || !adminFilterGenre) return;

  const consoles = [...new Set(allGames.map(g => g.console))].sort();
  const genres = [...new Set(allGames.map(g => g.genre))].sort();

  const currentConsole = adminFilterConsole.value;
  const currentGenre = adminFilterGenre.value;

  adminFilterConsole.innerHTML = '<option value="">Todas las consolas</option>';
  for (const c of consoles) {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    adminFilterConsole.appendChild(option);
  }
  adminFilterConsole.value = currentConsole;

  adminFilterGenre.innerHTML = '<option value="">Todos los géneros</option>';
  for (const g of genres) {
    const option = document.createElement('option');
    option.value = g;
    option.textContent = g;
    adminFilterGenre.appendChild(option);
  }
  adminFilterGenre.value = currentGenre;
}

/**
 * Render the admin games table.
 */
export function renderAdminGames() {
  if (!adminGamesTableBody || !adminSearch) return;

  const query = adminSearch.value.trim().toLowerCase();
  const consoleFilter = adminFilterConsole?.value || '';
  const genreFilter = adminFilterGenre?.value || '';

  const filtered = allGames
    .filter(g => {
      const matchesQuery =
        g.name.toLowerCase().includes(query) ||
        g.console.toLowerCase().includes(query) ||
        g.genre.toLowerCase().includes(query);
      const matchesConsole = !consoleFilter || g.console === consoleFilter;
      const matchesGenre = !genreFilter || g.genre === genreFilter;
      return matchesQuery && matchesConsole && matchesGenre;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  adminGamesTableBody.innerHTML = '';
  for (const game of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = adminGameRow(game);
    tr.querySelector('.admin-edit-btn')?.addEventListener('click', () => openEditModal(game.id));
    tr.querySelector('.admin-delete-btn')?.addEventListener('click', () => deleteGame(game.id));
    adminGamesTableBody.appendChild(tr);
  }
}

/**
 * Save a new or edited game from the admin form.
 * @param {SubmitEvent} event
 */
export async function saveAdminGame(event) {
  event.preventDefault();

  if (!adminGameName || !adminGameConsole || !adminGameGenre || !adminGameId) return;

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
        [name, consoleName, genre, parseInt(id, 10)],
      );
    } else {
      await turso.execute(
        'INSERT INTO games (name, console, genre) VALUES (?, ?, ?)',
        [name, consoleName, genre],
      );
    }

    resetAdminForm();
    await loadGames();
    renderAdminGames();
  } catch (err) {
    alert('Error al guardar: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Open the edit modal for a game.
 * @param {number} gameId
 */
export function openEditModal(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game || !editGameId || !editGameName || !editGameConsole || !editGameGenre) return;

  editGameId.value = String(game.id);
  editGameName.value = game.name;
  editGameGenre.value = game.genre;
  editGenreSelect?.setValue(game.genre);

  editGameConsole.innerHTML = '<option value="">Seleccionar consola...</option>';
  for (const c of [...new Set(allGames.map(g => g.console))].sort()) {
    const option = document.createElement('option');
    option.value = c;
    option.textContent = c;
    editGameConsole.appendChild(option);
  }
  editGameConsole.value = game.console;

  if (editModal) editModal.style.display = 'flex';
  loadEditRatings(gameId);
  loadEditReviews(gameId);
}

/**
 * Close the edit modal.
 */
export function closeEditModal() {
  if (editModal) editModal.style.display = 'none';
  editForm?.reset();
  if (editGameId) editGameId.value = '';
  if (editRatingsList) editRatingsList.innerHTML = '';
  if (editReviewsList) editReviewsList.innerHTML = '';
  editGenreSelect?.setValue('');
}

/**
 * Save changes to a game from the edit modal.
 * @param {SubmitEvent} event
 */
export async function saveEditGame(event) {
  event.preventDefault();

  if (!editGameId || !editGameName || !editGameConsole || !editGameGenre) return;

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
      [name, consoleName, genre, parseInt(id, 10)],
    );
    await loadGames();
    renderAdminGames();
    closeEditModal();
  } catch (err) {
    alert('Error al guardar juego: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Delete a game and its related data.
 * @param {number} gameId
 */
export async function deleteGame(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  if (!confirm(`¿Eliminar "${game.name}"? Se borrarán también sus rankings, reseñas y votos.`)) return;

  try {
    await turso.execute('DELETE FROM review_votes WHERE review_id IN (SELECT id FROM reviews WHERE game_id = ?)', [gameId]);
    await turso.execute('DELETE FROM reviews WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM ratings WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM favorites WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM play_orders WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM played_games WHERE game_id = ?', [gameId]);
    await turso.execute('DELETE FROM games WHERE id = ?', [gameId]);
    await loadGames();
    renderAdminGames();
  } catch (err) {
    alert('Error al eliminar: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Load ratings for the edit modal.
 * @param {number} gameId
 */
export async function loadEditRatings(gameId) {
  if (!editRatingsList) return;

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
      el.innerHTML = editRatingItem(r);
      el.querySelector('.edit-rating-save')?.addEventListener('click', () => saveEditRating(Number(r.id)));
      el.querySelector('.edit-rating-delete')?.addEventListener('click', () => deleteEditRating(Number(r.id)));
      editRatingsList.appendChild(el);
    }
  } catch (err) {
    editRatingsList.innerHTML = `<div class="error">Error cargando votos: ${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`;
  }
}

/**
 * Save an edited rating.
 * @param {number} ratingId
 */
export async function saveEditRating(ratingId) {
  const authorInput = document.getElementById(`edit-rating-author-${ratingId}`);
  const scoreInput = document.getElementById(`edit-rating-score-${ratingId}`);
  const author = authorInput?.value.trim();
  const score = parseInt(scoreInput?.value, 10);

  if (!author || Number.isNaN(score) || score < 1 || score > 10) {
    alert('Completa autor y puntuación (1-10).');
    return;
  }

  try {
    await turso.execute('UPDATE ratings SET author = ?, score = ? WHERE id = ?', [author, score, ratingId]);
    await loadGames();
  } catch (err) {
    alert('Error al guardar voto: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Delete a rating.
 * @param {number} ratingId
 */
export async function deleteEditRating(ratingId) {
  if (!confirm('¿Eliminar este voto?')) return;

  try {
    await turso.execute('DELETE FROM ratings WHERE id = ?', [ratingId]);
    const gameId = parseInt(editGameId?.value || '0', 10);
    await loadGames();
    loadEditRatings(gameId);
  } catch (err) {
    alert('Error al eliminar voto: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Load reviews for the edit modal.
 * @param {number} gameId
 */
export async function loadEditReviews(gameId) {
  if (!editReviewsList) return;

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
      el.innerHTML = editReviewItem(r);
      el.querySelector('.edit-review-save')?.addEventListener('click', () => saveEditReview(Number(r.id)));
      el.querySelector('.edit-review-delete')?.addEventListener('click', () => deleteEditReview(Number(r.id)));
      editReviewsList.appendChild(el);
    }
  } catch (err) {
    editReviewsList.innerHTML = `<div class="error">Error cargando reseñas: ${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`;
  }
}

/**
 * Save an edited review.
 * @param {number} reviewId
 */
export async function saveEditReview(reviewId) {
  const authorInput = document.getElementById(`edit-review-author-${reviewId}`);
  const contentInput = document.getElementById(`edit-review-content-${reviewId}`);
  const author = authorInput?.value.trim();
  const content = contentInput?.value.trim();

  if (!author || !content) {
    alert('Completa autor y contenido de la reseña.');
    return;
  }

  try {
    await turso.execute('UPDATE reviews SET author = ?, content = ? WHERE id = ?', [author, content, reviewId]);
    const gameId = parseInt(editGameId?.value || '0', 10);
    await loadGames();
    loadEditReviews(gameId);
  } catch (err) {
    alert('Error al guardar reseña: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Delete a review and its votes.
 * @param {number} reviewId
 */
export async function deleteEditReview(reviewId) {
  if (!confirm('¿Eliminar esta reseña y sus votos?')) return;

  try {
    await turso.execute('DELETE FROM review_votes WHERE review_id = ?', [reviewId]);
    await turso.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
    const gameId = parseInt(editGameId?.value || '0', 10);
    await loadGames();
    loadEditReviews(gameId);
  } catch (err) {
    alert('Error al eliminar reseña: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Load users from Turso.
 */
export async function loadUsers() {
  const { rows } = await turso.execute('SELECT id, username, display_name, role FROM users ORDER BY username');
  setAllUsers(rows);
}

/**
 * Render the admin users table.
 */
export function renderAdminUsers() {
  if (!adminUsersTableBody) return;

  adminUsersTableBody.innerHTML = '';
  for (const user of allUsers) {
    const tr = document.createElement('tr');
    tr.innerHTML = adminUserRow(user);
    tr.querySelector('.admin-user-edit-btn')?.addEventListener('click', () => openUserModal(Number(user.id)));
    tr.querySelector('.admin-user-password-btn')?.addEventListener('click', () => openUserPasswordModal(Number(user.id)));
    tr.querySelector('.admin-user-delete-btn')?.addEventListener('click', () => deleteUser(Number(user.id)));
    adminUsersTableBody.appendChild(tr);
  }
}

/**
 * Open the user modal for creating or editing a user.
 * @param {number|null} userId
 */
export function openUserModal(userId) {
  if (!userForm || !userFormId || !userFormUsername || !userFormDisplayName || !userFormRole || !userFormPasswordGroup || !userFormPassword || !userFormSubmit || !userModalTitle) return;

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

    userFormId.value = String(user.id);
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

  if (userModal) userModal.style.display = 'flex';
}

/**
 * Open the user modal in password-change mode.
 * @param {number} userId
 */
export function openUserPasswordModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user || !userForm || !userFormId || !userFormUsername || !userFormDisplayName || !userFormRole || !userFormPasswordGroup || !userFormPassword || !userFormSubmit || !userModalTitle) return;

  userForm.reset();
  userFormId.value = String(user.id);
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

  if (userModal) userModal.style.display = 'flex';
}

/**
 * Close the user modal.
 */
export function closeUserModal() {
  if (userModal) userModal.style.display = 'none';
  userForm?.reset();

  if (userFormUsername) userFormUsername.disabled = false;
  if (userFormDisplayName) userFormDisplayName.disabled = false;
  if (userFormRole) userFormRole.disabled = false;
}

/**
 * Save a user from the user modal.
 * @param {SubmitEvent} event
 */
export async function saveUser(event) {
  event.preventDefault();

  if (!isAdmin()) {
    alert('No tienes permisos.');
    return;
  }

  if (!userFormId || !userFormUsername || !userFormDisplayName || !userFormRole || !userFormPassword || !userFormSubmit) return;

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
        [username, hash, displayName, role],
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
      if (currentUser && currentUser.id === parseInt(id, 10)) {
        setCurrentUser({ ...currentUser, display_name: displayName, role });
        saveCurrentUser();
        renderAuthUI();
        applyFilters();
      }
    }

    await loadUsers();
    renderAdminUsers();
    closeUserModal();
  } catch (err) {
    alert('Error al guardar usuario: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Delete a user.
 * @param {number} userId
 */
export async function deleteUser(userId) {
  if (!isAdmin() || !currentUser) return;

  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  if (user.id === currentUser.id) {
    alert('No puedes eliminarte a ti mismo.');
    return;
  }

  if (!confirm(`¿Eliminar usuario "${user.username}"?`)) return;

  try {
    await turso.execute('DELETE FROM users WHERE id = ?', [userId]);
    await loadUsers();
    renderAdminUsers();
  } catch (err) {
    alert('Error al eliminar usuario: ' + (err instanceof Error ? err.message : String(err)));
  }
}
