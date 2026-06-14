// @ts-check

/** @type {HTMLDivElement|null} */
export const grid = document.getElementById('games-grid');

/** @type {HTMLSpanElement|null} */
export const countEl = document.getElementById('result-count');

/** @type {HTMLInputElement|null} */
export const filterName = document.getElementById('filter-name');

/** @type {HTMLSelectElement|null} */
export const filterConsole = document.getElementById('filter-console');

/** @type {HTMLSelectElement|null} */
export const filterRank = document.getElementById('filter-rank');

/** @type {HTMLSelectElement|null} */
export const filterReviews = document.getElementById('filter-reviews');

/** @type {HTMLSelectElement|null} */
export const sortBy = document.getElementById('sort-by');

/** @type {HTMLButtonElement|null} */
export const refreshBtn = document.getElementById('refresh-btn');

/** @type {HTMLButtonElement|null} */
export const favoritesBtn = document.getElementById('favorites-btn');

/** @type {HTMLButtonElement|null} */
export const playedBtn = document.getElementById('played-btn');

/** @type {HTMLButtonElement|null} */
export const playOrderBtn = document.getElementById('play-order-btn');

/** @type {HTMLDivElement|null} */
export const playOrderModal = document.getElementById('play-order-modal');

/** @type {HTMLButtonElement|null} */
export const closePlayOrderBtn = document.getElementById('close-play-order');

/** @type {HTMLDivElement|null} */
export const playOrderListEl = document.getElementById('play-order-list');

/** @type {HTMLDivElement|null} */
export const adminModal = document.getElementById('admin-modal');

/** @type {HTMLButtonElement|null} */
export const adminBtn = document.getElementById('admin-btn');

/** @type {HTMLButtonElement|null} */
export const closeAdminBtn = document.getElementById('close-admin');

/** @type {HTMLFormElement|null} */
export const adminForm = document.getElementById('admin-game-form');

/** @type {HTMLButtonElement|null} */
export const adminSubmitBtn = document.getElementById('admin-submit-btn');

/** @type {HTMLButtonElement|null} */
export const adminCancelBtn = document.getElementById('admin-cancel-btn');

/** @type {HTMLInputElement|null} */
export const adminGameId = document.getElementById('admin-game-id');

/** @type {HTMLInputElement|null} */
export const adminGameName = document.getElementById('admin-game-name');

/** @type {HTMLInputElement|null} */
export const adminGameConsole = document.getElementById('admin-game-console');

/** @type {HTMLInputElement|null} */
export const adminGameGenre = document.getElementById('admin-game-genre');

/** @type {HTMLDataListElement|null} */
export const adminConsolesList = document.getElementById('admin-consoles-list');

/** @type {HTMLInputElement|null} */
export const adminSearch = document.getElementById('admin-search');

/** @type {HTMLTableSectionElement|null} */
export const adminGamesTableBody = document.querySelector('#admin-games-table tbody');

/** @type {HTMLDivElement|null} */
export const editModal = document.getElementById('edit-modal');

/** @type {HTMLButtonElement|null} */
export const closeEditBtn = document.getElementById('close-edit');

/** @type {HTMLFormElement|null} */
export const editForm = document.getElementById('edit-game-form');

/** @type {HTMLInputElement|null} */
export const editGameId = document.getElementById('edit-game-id');

/** @type {HTMLInputElement|null} */
export const editGameName = document.getElementById('edit-game-name');

/** @type {HTMLInputElement|null} */
export const editGameConsole = document.getElementById('edit-game-console');

/** @type {HTMLInputElement|null} */
export const editGameGenre = document.getElementById('edit-game-genre');

/** @type {HTMLDataListElement|null} */
export const editConsolesList = document.getElementById('edit-consoles-list');

/** @type {HTMLDivElement|null} */
export const editRatingsList = document.getElementById('edit-ratings-list');

/** @type {HTMLDivElement|null} */
export const editReviewsList = document.getElementById('edit-reviews-list');

/** @type {HTMLDivElement|null} */
export const authLoggedOut = document.getElementById('auth-logged-out');

/** @type {HTMLDivElement|null} */
export const authLoggedIn = document.getElementById('auth-logged-in');

/** @type {HTMLInputElement|null} */
export const loginUsername = document.getElementById('login-username');

/** @type {HTMLInputElement|null} */
export const loginPassword = document.getElementById('login-password');

/** @type {HTMLButtonElement|null} */
export const loginBtn = document.getElementById('login-btn');

/** @type {HTMLButtonElement|null} */
export const guestBtn = document.getElementById('guest-btn');

/** @type {HTMLSpanElement|null} */
export const authUserName = document.getElementById('auth-user-name');

/** @type {HTMLButtonElement|null} */
export const accountBtn = document.getElementById('account-btn');

/** @type {HTMLButtonElement|null} */
export const logoutBtn = document.getElementById('logout-btn');

/** @type {HTMLDivElement|null} */
export const accountModal = document.getElementById('account-modal');

/** @type {HTMLButtonElement|null} */
export const closeAccountBtn = document.getElementById('close-account');

/** @type {HTMLFormElement|null} */
export const accountForm = document.getElementById('account-form');

/** @type {HTMLInputElement|null} */
export const accountDisplayName = document.getElementById('account-display-name');

/** @type {HTMLInputElement|null} */
export const accountNewPassword = document.getElementById('account-new-password');

/** @type {HTMLInputElement|null} */
export const accountConfirmPassword = document.getElementById('account-confirm-password');

/** @type {HTMLDivElement|null} */
export const userModal = document.getElementById('user-modal');

/** @type {HTMLHeadingElement|null} */
export const userModalTitle = document.getElementById('user-modal-title');

/** @type {HTMLButtonElement|null} */
export const closeUserBtn = document.getElementById('close-user');

/** @type {HTMLFormElement|null} */
export const userForm = document.getElementById('user-form');

/** @type {HTMLInputElement|null} */
export const userFormId = document.getElementById('user-form-id');

/** @type {HTMLInputElement|null} */
export const userFormUsername = document.getElementById('user-form-username');

/** @type {HTMLInputElement|null} */
export const userFormDisplayName = document.getElementById('user-form-display-name');

/** @type {HTMLSelectElement|null} */
export const userFormRole = document.getElementById('user-form-role');

/** @type {HTMLDivElement|null} */
export const userFormPasswordGroup = document.getElementById('user-form-password-group');

/** @type {HTMLInputElement|null} */
export const userFormPassword = document.getElementById('user-form-password');

/** @type {HTMLButtonElement|null} */
export const userFormSubmit = document.getElementById('user-form-submit');

/** @type {HTMLButtonElement|null} */
export const userFormCancel = document.getElementById('user-form-cancel');

/** @type {HTMLElement|null} */
export const adminUsersSection = document.getElementById('admin-users-section');

/** @type {NodeListOf<HTMLElement>} */
export const adminTabs = document.querySelectorAll('.admin-tab');

/** @type {NodeListOf<HTMLElement>} */
export const adminTabPanels = document.querySelectorAll('.admin-tab-panel');

/** @type {HTMLButtonElement|null} */
export const adminNewUserBtn = document.getElementById('admin-new-user-btn');

/** @type {HTMLTableSectionElement|null} */
export const adminUsersTableBody = document.querySelector('#admin-users-table tbody');

/** @type {HTMLElement|null} */
export const loginRequired = document.getElementById('login-required');
