// @ts-check

import {
  accountBtn,
  accountForm,
  accountModal,
  adminBtn,
  adminCancelBtn,
  adminForm,
  adminModal,
  adminSearch,
  adminTabs,
  closeAccountBtn,
  closeAdminBtn,
  closeEditBtn,
  closePlayOrderBtn,
  closeUserBtn,
  editForm,
  editModal,
  favoritesBtn,
  filterConsole,
  filterName,
  filterRank,
  filterReviews,
  guestBtn,
  loginBtn,
  loginPassword,
  loginUsername,
  logoutBtn,
  playOrderBtn,
  playOrderListEl,
  playOrderModal,
  playedBtn,
  refreshBtn,
  sortBy,
  userForm,
  userFormCancel,
} from './elements.js';
import { currentUser, draggedPlayOrderId, loadCurrentUser } from './state.js';
import { applyFilters, loadGames } from './games.js';
import {
  closeAccountModal,
  login,
  loginGuest,
  logout,
  openAccountModal,
  renderAuthUI,
  saveAccount,
} from './auth.js';
import {
  addToPlayOrder,
  closePlayOrderModal,
  doToggleFavoritesFilter,
  doTogglePlayedFilter,
  getDragTargetRank,
  loadUserLists,
  movePlayOrder,
  openPlayOrderModal,
  removeFromPlayOrder,
  setPlayOrderRank,
  toggleFavorite,
  togglePlayed,
} from './lists.js';
import {
  submitRating,
  submitReview,
  toggleRateForm,
  toggleReviews,
  voteReview,
} from './reviews.js';
import {
  closeAdminModal,
  closeEditModal,
  closeUserModal,
  deleteGame,
  openAdminModal,
  openEditModal,
  openUserModal,
  renderAdminGames,
  resetAdminForm,
  saveAdminGame,
  saveEditGame,
  saveUser,
  switchAdminTab,
} from './admin.js';

// Expose functions used by inline onclick handlers in templates.
Object.assign(window, {
  submitRating,
  submitReview,
  voteReview,
  toggleReviews,
  toggleRateForm,
  deleteGame,
  openEditModal,
  openUserModal,
  toggleFavorite,
  togglePlayed,
  addToPlayOrder,
  removeFromPlayOrder,
  movePlayOrder,
  setPlayOrderRank,
});

// Filter inputs.
filterName?.addEventListener('input', applyFilters);
[filterConsole, filterRank, filterReviews, sortBy].forEach(el => {
  el?.addEventListener('change', applyFilters);
});

refreshBtn?.addEventListener('click', async () => {
  await loadGames();
  await loadUserLists();
  applyFilters();
});

// Auth.
loginBtn?.addEventListener('click', login);
guestBtn?.addEventListener('click', loginGuest);
logoutBtn?.addEventListener('click', logout);
accountBtn?.addEventListener('click', openAccountModal);
closeAccountBtn?.addEventListener('click', closeAccountModal);
accountModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeAccountModal);
accountForm?.addEventListener('submit', saveAccount);
loginPassword?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
loginUsername?.addEventListener('keydown', e => { if (e.key === 'Enter') loginPassword?.focus(); });

// Lists.
favoritesBtn?.addEventListener('click', doToggleFavoritesFilter);
playedBtn?.addEventListener('click', doTogglePlayedFilter);
playOrderBtn?.addEventListener('click', openPlayOrderModal);
closePlayOrderBtn?.addEventListener('click', closePlayOrderModal);
playOrderModal?.querySelector('.modal-backdrop')?.addEventListener('click', closePlayOrderModal);

// Admin.
adminBtn?.addEventListener('click', openAdminModal);
closeAdminBtn?.addEventListener('click', closeAdminModal);
adminModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeAdminModal);
adminForm?.addEventListener('submit', saveAdminGame);
adminCancelBtn?.addEventListener('click', resetAdminForm);
adminSearch?.addEventListener('input', renderAdminGames);
adminTabs.forEach(tab => {
  tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab || ''));
});

// Edit modal.
closeEditBtn?.addEventListener('click', closeEditModal);
editModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeEditModal);
editForm?.addEventListener('submit', saveEditGame);

// User modal.
closeUserBtn?.addEventListener('click', closeUserModal);
userForm?.addEventListener('submit', saveUser);
userFormCancel?.addEventListener('click', closeUserModal);

// Play order drag and drop.
playOrderListEl?.addEventListener('dragover', e => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

  const draggedId = draggedPlayOrderId;
  if (!draggedId || !playOrderListEl) return;

  const items = [...playOrderListEl.querySelectorAll('.play-order-item')];
  items.forEach(item => item.classList.remove('drag-over'));

  const targetRank = getDragTargetRank(playOrderListEl, e.clientY, draggedId);
  const target = items.find(item => {
    if (parseInt(item.dataset.gameId || '0', 10) === draggedId) return false;
    const rect = item.getBoundingClientRect();
    return getDragTargetRank(playOrderListEl, rect.top + rect.height / 2, draggedId) === targetRank;
  });

  target?.classList.add('drag-over');
});

playOrderListEl?.addEventListener('dragleave', e => {
  if (!playOrderListEl?.contains(/** @type {Node|null} */ (e.relatedTarget))) {
    playOrderListEl.querySelectorAll('.play-order-item').forEach(item => item.classList.remove('drag-over'));
  }
});

playOrderListEl?.addEventListener('drop', e => {
  e.preventDefault();
  const data = e.dataTransfer?.getData('text/plain');
  const gameId = parseInt(data || '', 10);
  if (!Number.isFinite(gameId) || !playOrderListEl) return;
  const newRank = getDragTargetRank(playOrderListEl, e.clientY, gameId);
  setPlayOrderRank(gameId, newRank);
});

// Initial load.
loadCurrentUser();
renderAuthUI();

if (currentUser) {
  (async () => {
    await loadGames();
    await loadUserLists();
    applyFilters();
  })();
}
