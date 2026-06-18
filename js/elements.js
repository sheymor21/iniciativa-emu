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
export const suggestionBtn = document.getElementById('suggestion-btn');

/** @type {HTMLButtonElement|null} */
export const mySuggestionsBtn = document.getElementById('my-suggestions-btn');

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

/** @type {HTMLSelectElement|null} */
export const adminGameConsole = document.getElementById('admin-game-console');

/** @type {HTMLInputElement|null} */
export const adminGameGenre = document.getElementById('admin-game-genre');

/** @type {HTMLDivElement|null} */
export const adminGameGenreSelect = document.getElementById('admin-game-genre-select');

/** @type {HTMLInputElement|null} */
export const adminSearch = document.getElementById('admin-search');

/** @type {HTMLSelectElement|null} */
export const adminFilterConsole = document.getElementById('admin-filter-console');

/** @type {HTMLSelectElement|null} */
export const adminFilterGenre = document.getElementById('admin-filter-genre');

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

/** @type {HTMLSelectElement|null} */
export const editGameConsole = document.getElementById('edit-game-console');

/** @type {HTMLInputElement|null} */
export const editGameGenre = document.getElementById('edit-game-genre');

/** @type {HTMLDivElement|null} */
export const editGameGenreSelect = document.getElementById('edit-game-genre-select');

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

/** @type {HTMLDivElement|null} */
export const suggestionModal = document.getElementById('suggestion-modal');

/** @type {HTMLButtonElement|null} */
export const closeSuggestionBtn = document.getElementById('close-suggestion');

/** @type {HTMLFormElement|null} */
export const suggestionForm = document.getElementById('suggestion-form');

/** @type {HTMLSelectElement|null} */
export const suggestionType = document.getElementById('suggestion-type');

/** @type {HTMLInputElement|null} */
export const suggestionTitle = document.getElementById('suggestion-title');

/** @type {HTMLTextAreaElement|null} */
export const suggestionDescription = document.getElementById('suggestion-description');

/** @type {HTMLDivElement|null} */
export const suggestionDetailModal = document.getElementById('suggestion-detail-modal');

/** @type {HTMLButtonElement|null} */
export const closeSuggestionDetailBtn = document.getElementById('close-suggestion-detail');

/** @type {HTMLHeadingElement|null} */
export const suggestionDetailTitle = document.getElementById('suggestion-detail-title');

/** @type {HTMLDivElement|null} */
export const suggestionDetailMeta = document.getElementById('suggestion-detail-meta');

/** @type {HTMLDivElement|null} */
export const suggestionDetailBody = document.getElementById('suggestion-detail-body');

/** @type {HTMLDivElement|null} */
export const suggestionDetailActions = document.getElementById('suggestion-detail-actions');

/** @type {HTMLDivElement|null} */
export const suggestionCommentsList = document.getElementById('suggestion-comments-list');

/** @type {HTMLFormElement|null} */
export const suggestionCommentForm = document.getElementById('suggestion-comment-form');

/** @type {HTMLInputElement|null} */
export const suggestionCommentId = document.getElementById('suggestion-comment-id');

/** @type {HTMLTextAreaElement|null} */
export const suggestionCommentContent = document.getElementById('suggestion-comment-content');

/** @type {HTMLSelectElement|null} */
export const adminSuggestionFilter = document.getElementById('admin-suggestion-filter');

/** @type {HTMLTableSectionElement|null} */
export const adminSuggestionsTableBody = document.querySelector('#admin-suggestions-table tbody');

/** @type {HTMLDivElement|null} */
export const mySuggestionsModal = document.getElementById('my-suggestions-modal');

/** @type {HTMLButtonElement|null} */
export const closeMySuggestionsBtn = document.getElementById('close-my-suggestions');

/** @type {HTMLTableSectionElement|null} */
export const mySuggestionsTableBody = document.querySelector('#my-suggestions-table tbody');

/** @type {HTMLDivElement|null} */
export const paginationContainer = document.getElementById('pagination-container');

/** @type {HTMLInputElement|null} */
export const adminNewGenreName = document.getElementById('admin-new-genre-name');

/** @type {HTMLButtonElement|null} */
export const adminAddGenreBtn = document.getElementById('admin-add-genre-btn');

/** @type {HTMLDivElement|null} */
export const adminGenresList = document.getElementById('admin-genres-list');

/** @type {HTMLInputElement|null} */
export const adminGenresSearch = document.getElementById('admin-genres-search');

/** @type {HTMLSpanElement|null} */
export const adminGenresCount = document.getElementById('admin-genres-count');
