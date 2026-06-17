// @ts-check

import { turso } from './turso-client.js';
import {
  accountBtn,
  accountConfirmPassword,
  accountDisplayName,
  accountModal,
  accountNewPassword,
  adminBtn,
  authLoggedIn,
  authLoggedOut,
  authUserName,
  favoritesBtn,
  loginPassword,
  loginRequired,
  loginUsername,
  mySuggestionsBtn,
  playOrderBtn,
  playedBtn,
  suggestionBtn,
} from './elements.js';
import {
  clearCurrentUser,
  currentUser,
  isAdmin,
  isLoggedIn,
  loadCurrentUser,
  saveCurrentUser,
  setCurrentUser,
  setShowOnlyFavorites,
  setShowOnlyPlayed,
} from './state.js';
import { escapeHtml, hashPassword, roleLabel } from './utils.js';
import { loadUserLists, updateFavoritesButtonState, updatePlayedButtonState } from './lists.js';
import { applyFilters, loadGames } from './games.js';
import { updateTabCounts } from './tab-counts.js';

/**
 * Render the auth bar and visibility based on current user.
 */
export function renderAuthUI() {
  if (!isLoggedIn()) {
    setShowOnlyFavorites(false);
    setShowOnlyPlayed(false);
  }

  if (currentUser) {
    if (authLoggedOut) authLoggedOut.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'flex';
    if (authUserName) authUserName.textContent = `${escapeHtml(currentUser.display_name)} (${roleLabel(currentUser.role)})`;
    if (adminBtn) adminBtn.style.display = isAdmin() ? 'inline-block' : 'none';
    if (accountBtn) accountBtn.style.display = currentUser.role === 'guest' ? 'none' : 'inline-block';
    if (favoritesBtn) favoritesBtn.style.display = isLoggedIn() ? 'inline-block' : 'none';
    if (playedBtn) playedBtn.style.display = isLoggedIn() ? 'inline-block' : 'none';
    if (playOrderBtn) playOrderBtn.style.display = isLoggedIn() ? 'inline-block' : 'none';
    if (suggestionBtn) suggestionBtn.style.display = 'inline-block';
    if (mySuggestionsBtn) mySuggestionsBtn.style.display = 'inline-block';
  } else {
    if (authLoggedOut) authLoggedOut.style.display = 'flex';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
    if (accountBtn) accountBtn.style.display = 'none';
    if (favoritesBtn) favoritesBtn.style.display = 'none';
    if (playedBtn) playedBtn.style.display = 'none';
    if (playOrderBtn) playOrderBtn.style.display = 'none';
    if (suggestionBtn) suggestionBtn.style.display = 'none';
    if (mySuggestionsBtn) mySuggestionsBtn.style.display = 'none';
  }

  updateFavoritesButtonState();
  updatePlayedButtonState();
  updateMainVisibility();
  updateTabCounts();
}

/**
 * Show/hide main content based on login state.
 */
export function updateMainVisibility() {
  const mainSections = document.querySelectorAll('.filters, .status-bar, #games-grid');
  if (!loginRequired) return;

  if (currentUser) {
    mainSections.forEach(s => { s.style.display = ''; });
    loginRequired.style.display = 'none';
  } else {
    mainSections.forEach(s => { s.style.display = 'none'; });
    loginRequired.style.display = 'block';
  }
}

/**
 * Log in with username and password.
 */
export async function login() {
  if (!loginUsername || !loginPassword) return;

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

    setCurrentUser({
      id: Number(user.id),
      username: String(user.username),
      display_name: String(user.display_name),
      role: /** @type {'admin'|'user'|'guest'} */ (user.role),
    });
    saveCurrentUser();

    loginUsername.value = '';
    loginPassword.value = '';
    renderAuthUI();
    await loadGames();
    await loadUserLists();
    applyFilters();
  } catch (err) {
    alert('Error al iniciar sesión: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Log in as guest.
 */
export function loginGuest() {
  setCurrentUser({ id: null, username: 'guest', display_name: 'Invitado', role: 'guest' });
  saveCurrentUser();
  renderAuthUI();
  loadGames();
}

/**
 * Log out and reset UI.
 */
export function logout() {
  clearCurrentUser();
  renderAuthUI();

  const grid = document.getElementById('games-grid');
  const countEl = document.getElementById('result-count');
  if (grid) grid.innerHTML = '<div class="loading">Cargando juegos...</div>';
  if (countEl) countEl.textContent = 'Cargando...';
}

/**
 * Open the account modal.
 */
export function openAccountModal() {
  if (!currentUser || currentUser.role === 'guest') return;
  if (accountDisplayName) accountDisplayName.value = currentUser.display_name;
  if (accountNewPassword) accountNewPassword.value = '';
  if (accountConfirmPassword) accountConfirmPassword.value = '';
  if (accountModal) accountModal.style.display = 'flex';
}

/**
 * Close the account modal.
 */
export function closeAccountModal() {
  if (accountModal) accountModal.style.display = 'none';
}

/**
 * Save account changes.
 * @param {SubmitEvent} event
 */
export async function saveAccount(event) {
  event.preventDefault();

  if (!currentUser || currentUser.role === 'guest') return;
  if (!accountDisplayName || !accountNewPassword || !accountConfirmPassword) return;

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
    /** @type {string[]} */
    const updates = ['display_name = ?'];
    const args = [displayName];

    if (newPassword) {
      const hash = await hashPassword(newPassword);
      updates.push('password_hash = ?');
      args.push(hash);
    }

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    args.push(currentUser.id);

    await turso.execute(sql, args);
    setCurrentUser({ ...currentUser, display_name: displayName });
    saveCurrentUser();
    renderAuthUI();
    applyFilters();
    closeAccountModal();
    alert('Cambios guardados.');
  } catch (err) {
    alert('Error al guardar: ' + (err instanceof Error ? err.message : String(err)));
  }
}

export { loadCurrentUser, saveCurrentUser };
