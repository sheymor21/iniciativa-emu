// @ts-check

import { turso } from './turso-client.js';
import {
  adminSuggestionFilter,
  adminSuggestionsTableBody,
  mySuggestionsBtn,
  mySuggestionsModal,
  mySuggestionsTableBody,
  suggestionBtn,
  suggestionCommentContent,
  suggestionCommentForm,
  suggestionCommentId,
  suggestionCommentsList,
  suggestionDescription,
  suggestionDetailActions,
  suggestionDetailBody,
  suggestionDetailMeta,
  suggestionDetailModal,
  suggestionDetailTitle,
  suggestionForm,
  suggestionModal,
  suggestionTitle,
  suggestionType,
} from './elements.js';
import { currentUser, isAdmin } from './state.js';
import { escapeHtml } from './utils.js';
import { suggestionRow, suggestionCommentItem, userSuggestionRow } from './templates.js';

/**
 * @typedef {object} Suggestion
 * @property {number} id
 * @property {'game'|'page'} type
 * @property {string} title
 * @property {string} description
 * @property {string} author
 * @property {'pending'|'completed'|'denied'} status
 * @property {string} created_at
 */

/**
 * @typedef {object} SuggestionComment
 * @property {number} id
 * @property {number} suggestion_id
 * @property {string} author
 * @property {string} content
 * @property {string} created_at
 */

/** @type {Suggestion[]} */
let allSuggestions = [];

/**
 * Human-readable type label.
 * @param {Suggestion['type']} type
 * @returns {string}
 */
function suggestionTypeLabel(type) {
  return type === 'game' ? 'Juego' : 'Página';
}

/**
 * Human-readable status label.
 * @param {Suggestion['status']} status
 * @returns {string}
 */
function suggestionStatusLabel(status) {
  const labels = { pending: 'Pendiente', completed: 'Completada', denied: 'Denegada' };
  return labels[status] || status;
}

/**
 * Status badge class.
 * @param {Suggestion['status']} status
 * @returns {string}
 */
function suggestionStatusClass(status) {
  return `status-${status}`;
}

/**
 * Format a date string to a short locale string.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Show/hide the suggestion button based on auth state.
 */
export function updateSuggestionButton() {
  if (suggestionBtn) suggestionBtn.style.display = currentUser ? 'inline-block' : 'none';
  if (mySuggestionsBtn) mySuggestionsBtn.style.display = currentUser ? 'inline-block' : 'none';
}

/**
 * Get the display name used as suggestion author for the current user.
 * @returns {string}
 */
function currentUserAuthorName() {
  return currentUser?.display_name || currentUser?.username || '';
}

/**
 * Open the suggestion submission modal.
 */
export function openSuggestionModal() {
  if (!currentUser) {
    alert('Inicia sesión para enviar una sugerencia.');
    return;
  }
  suggestionForm?.reset();
  if (suggestionModal) suggestionModal.style.display = 'flex';
}

/**
 * Close the suggestion submission modal.
 */
export function closeSuggestionModal() {
  if (suggestionModal) suggestionModal.style.display = 'none';
}

/**
 * Submit a new suggestion.
 * @param {SubmitEvent} event
 */
export async function submitSuggestion(event) {
  event.preventDefault();

  if (!currentUser) {
    alert('Inicia sesión para enviar una sugerencia.');
    return;
  }
  if (!suggestionType || !suggestionTitle || !suggestionDescription) return;

  const type = /** @type {Suggestion['type']} */ (suggestionType.value);
  const title = suggestionTitle.value.trim();
  const description = suggestionDescription.value.trim();
  const author = currentUser.display_name || currentUser.username || 'Anónimo';

  if (!title || !description) {
    alert('Completa todos los campos.');
    return;
  }

  try {
    await turso.execute(
      'INSERT INTO suggestions (type, title, description, author) VALUES (?, ?, ?, ?)',
      [type, title, description, author],
    );
    closeSuggestionModal();
    await loadSuggestions();
    if (mySuggestionsModal && mySuggestionsModal.style.display === 'flex') {
      renderMySuggestions();
    }
    alert('Sugerencia enviada.');
  } catch (err) {
    alert('Error al enviar sugerencia: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Load all suggestions from Turso.
 */
export async function loadSuggestions() {
  try {
    const { rows } = await turso.execute(
      'SELECT id, type, title, description, author, status, created_at FROM suggestions ORDER BY created_at DESC',
    );
    allSuggestions = rows.map(row => ({
      id: Number(row.id),
      type: /** @type {Suggestion['type']} */ (String(row.type)),
      title: String(row.title),
      description: String(row.description),
      author: String(row.author),
      status: /** @type {Suggestion['status']} */ (String(row.status)),
      created_at: String(row.created_at),
    }));
  } catch (err) {
    console.error('Error loading suggestions:', err);
    allSuggestions = [];
  }
}

/**
 * Render the admin suggestions table.
 */
export function renderAdminSuggestions() {
  if (!adminSuggestionsTableBody || !adminSuggestionFilter) return;

  const filter = adminSuggestionFilter.value;
  const filtered = filter
    ? allSuggestions.filter(s => s.status === filter)
    : allSuggestions;

  adminSuggestionsTableBody.innerHTML = '';
  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="empty-state">No hay sugerencias.</td>`;
    adminSuggestionsTableBody.appendChild(tr);
    return;
  }

  for (const suggestion of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = suggestionRow(suggestion, {
      typeLabel: suggestionTypeLabel(suggestion.type),
      statusLabel: suggestionStatusLabel(suggestion.status),
      statusClass: suggestionStatusClass(suggestion.status),
      date: formatDate(suggestion.created_at),
      showAdminActions: true,
    });
    tr.querySelector('.suggestion-view-btn')?.addEventListener('click', () => openSuggestionDetailModal(suggestion.id));
    tr.querySelector('.suggestion-complete-btn')?.addEventListener('click', () => updateSuggestionStatus(suggestion.id, 'completed'));
    tr.querySelector('.suggestion-deny-btn')?.addEventListener('click', () => updateSuggestionStatus(suggestion.id, 'denied'));
    adminSuggestionsTableBody.appendChild(tr);
  }
}

/**
 * Open the suggestion detail modal.
 * @param {number} suggestionId
 */
export async function openSuggestionDetailModal(suggestionId) {
  if (!suggestionDetailModal || !suggestionDetailTitle || !suggestionDetailMeta || !suggestionDetailBody || !suggestionDetailActions) return;

  const suggestion = allSuggestions.find(s => s.id === suggestionId);
  if (!suggestion) return;

  if (suggestionCommentId) suggestionCommentId.value = String(suggestion.id);
  suggestionDetailTitle.textContent = suggestion.title;
  suggestionDetailMeta.innerHTML = `
    <span class="badge ${suggestionStatusClass(suggestion.status)}">${escapeHtml(suggestionStatusLabel(suggestion.status))}</span>
    <span>${escapeHtml(suggestionTypeLabel(suggestion.type))}</span>
    <span>por ${escapeHtml(suggestion.author)}</span>
    <span>${escapeHtml(formatDate(suggestion.created_at))}</span>
  `;
  suggestionDetailBody.textContent = suggestion.description;

  if (isAdmin()) {
    suggestionDetailActions.innerHTML = `
      <button class="btn btn-success" onclick="updateSuggestionStatus(${suggestion.id}, 'completed')">Marcar completada</button>
      <button class="btn btn-danger" onclick="updateSuggestionStatus(${suggestion.id}, 'denied')">Denegar</button>
      <button class="btn btn-secondary" onclick="updateSuggestionStatus(${suggestion.id}, 'pending')">Volver a pendiente</button>
    `;
    suggestionDetailActions.style.display = 'flex';
  } else {
    suggestionDetailActions.innerHTML = '';
    suggestionDetailActions.style.display = 'none';
  }

  if (suggestionCommentForm) {
    suggestionCommentForm.style.display = isAdmin() ? 'flex' : 'none';
  }

  suggestionDetailModal.style.display = 'flex';
  await loadSuggestionComments(suggestion.id);
}

/**
 * Close the suggestion detail modal.
 */
export function closeSuggestionDetailModal() {
  if (suggestionDetailModal) suggestionDetailModal.style.display = 'none';
  if (suggestionCommentForm) suggestionCommentForm.reset();
}

/**
 * Filter suggestions authored by the current user.
 * @returns {Suggestion[]}
 */
function getUserSuggestions() {
  const author = currentUserAuthorName();
  if (!author) return [];
  return allSuggestions.filter(s => s.author === author);
}

/**
 * Render the current user's suggestions table.
 */
export function renderMySuggestions() {
  if (!mySuggestionsTableBody) return;

  const suggestions = getUserSuggestions();
  mySuggestionsTableBody.innerHTML = '';

  if (suggestions.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="empty-state">No has enviado sugerencias.</td>`;
    mySuggestionsTableBody.appendChild(tr);
    return;
  }

  for (const suggestion of suggestions) {
    const tr = document.createElement('tr');
    tr.innerHTML = userSuggestionRow(suggestion, {
      typeLabel: suggestionTypeLabel(suggestion.type),
      statusLabel: suggestionStatusLabel(suggestion.status),
      statusClass: suggestionStatusClass(suggestion.status),
      date: formatDate(suggestion.created_at),
    });
    tr.querySelector('.suggestion-view-btn')?.addEventListener('click', () => openSuggestionDetailModal(suggestion.id));
    mySuggestionsTableBody.appendChild(tr);
  }
}

/**
 * Open the "my suggestions" modal.
 */
export async function openMySuggestionsModal() {
  if (!currentUser) {
    alert('Inicia sesión para ver tus sugerencias.');
    return;
  }
  await loadSuggestions();
  renderMySuggestions();
  if (mySuggestionsModal) mySuggestionsModal.style.display = 'flex';
}

/**
 * Close the "my suggestions" modal.
 */
export function closeMySuggestionsModal() {
  if (mySuggestionsModal) mySuggestionsModal.style.display = 'none';
}

/**
 * Update a suggestion status.
 * @param {number} suggestionId
 * @param {Suggestion['status']} status
 */
export async function updateSuggestionStatus(suggestionId, status) {
  if (!isAdmin()) {
    alert('No tienes permisos.');
    return;
  }

  try {
    await turso.execute(
      "UPDATE suggestions SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, suggestionId],
    );
    await loadSuggestions();
    renderAdminSuggestions();
    renderMySuggestions();

    const currentId = parseInt(suggestionCommentId?.value || '0', 10);
    if (currentId === suggestionId) {
      const suggestion = allSuggestions.find(s => s.id === suggestionId);
      if (suggestion && suggestionDetailTitle) {
        openSuggestionDetailModal(suggestion.id);
      }
    }
  } catch (err) {
    alert('Error al actualizar estado: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Load comments for a suggestion.
 * @param {number} suggestionId
 */
export async function loadSuggestionComments(suggestionId) {
  if (!suggestionCommentsList) return;

  suggestionCommentsList.innerHTML = '<div class="loading" style="padding:0.5rem;">Cargando comentarios...</div>';

  try {
    const { rows } = await turso.execute(
      'SELECT id, author, content, created_at FROM suggestion_comments WHERE suggestion_id = ? ORDER BY created_at ASC',
      [suggestionId],
    );

    if (rows.length === 0) {
      suggestionCommentsList.innerHTML = '<div class="empty-state" style="padding:0.5rem;">Sin comentarios.</div>';
      return;
    }

    suggestionCommentsList.innerHTML = '';
    for (const comment of rows) {
      const el = document.createElement('div');
      el.className = 'suggestion-comment';
      el.innerHTML = suggestionCommentItem({
        id: Number(comment.id),
        suggestion_id: Number(comment.suggestion_id),
        author: String(comment.author),
        content: String(comment.content),
        created_at: String(comment.created_at),
      }, formatDate(String(comment.created_at)));
      suggestionCommentsList.appendChild(el);
    }
  } catch (err) {
    suggestionCommentsList.innerHTML = `<div class="error">Error cargando comentarios: ${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`;
  }
}

/**
 * Submit a comment on a suggestion.
 * @param {SubmitEvent} event
 */
export async function submitSuggestionComment(event) {
  event.preventDefault();

  if (!isAdmin() || !currentUser) {
    alert('No tienes permisos.');
    return;
  }
  if (!suggestionCommentId || !suggestionCommentContent) return;

  const suggestionId = parseInt(suggestionCommentId.value, 10);
  const content = suggestionCommentContent.value.trim();
  const author = currentUser.display_name || currentUser.username || 'Admin';

  if (!Number.isFinite(suggestionId) || !content) {
    alert('Introduce un comentario.');
    return;
  }

  try {
    await turso.execute(
      'INSERT INTO suggestion_comments (suggestion_id, author, content) VALUES (?, ?, ?)',
      [suggestionId, author, content],
    );
    suggestionCommentContent.value = '';
    await loadSuggestionComments(suggestionId);
  } catch (err) {
    alert('Error al comentar: ' + (err instanceof Error ? err.message : String(err)));
  }
}
