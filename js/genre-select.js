// @ts-check

/**
 * Custom multi-select genre picker.
 *
 * Renders a toggle button + chips. Clicking the toggle opens a modal
 * where the user can search and check genres. A hidden input stays in sync.
 */

import { escapeHtml } from './utils.js';

export class GenreSelect {
  /**
   * @param {HTMLElement} container
   * @param {HTMLInputElement} hiddenInput
   * @param {string[]} genres
   * @param {object} [options]
   * @param {(genres: string[]) => void} [options.onChange]
   */
  constructor(container, hiddenInput, genres = [], options = {}) {
    /** @type {HTMLElement} */
    this.container = container;
    /** @type {HTMLInputElement} */
    this.hiddenInput = hiddenInput;
    /** @type {string[]} */
    this.allGenres = [...genres].sort((a, b) => a.localeCompare(b));
    /** @type {Set<string>} */
    this.selected = new Set();
    /** @type {(genres: string[]) => void | undefined} */
    this.onChange = options.onChange;
    /** @type {string} */
    this.searchQuery = '';

    this.render();
    this.setValue(hiddenInput.value);
  }

  /**
   * Render the component structure.
   */
  render() {
    this.container.innerHTML = `
      <div class="genre-select">
        <button type="button" class="genre-toggle btn btn-secondary">
          <span class="genre-toggle-text">Seleccionar géneros</span>
          <span class="genre-toggle-arrow">▼</span>
        </button>
        <div class="genre-modal" style="display:none;">
          <div class="genre-modal-backdrop"></div>
          <div class="genre-modal-content">
            <div class="genre-modal-header">
              <h3>Seleccionar géneros</h3>
              <button type="button" class="genre-modal-close" aria-label="Cerrar">×</button>
            </div>
            <div class="genre-modal-search">
              <input type="text" class="genre-modal-search-input" placeholder="Buscar género...">
            </div>
            <div class="genre-modal-chips"><div class="genre-chips"></div></div>
            <div class="genre-modal-options"></div>
            <div class="genre-modal-footer">
              <button type="button" class="genre-modal-done btn btn-primary">Listo</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.toggleBtn = this.container.querySelector('.genre-toggle');
    this.chipsEl = this.container.querySelector('.genre-modal-chips .genre-chips');
    this.modal = this.container.querySelector('.genre-modal');
    this.modalBackdrop = this.container.querySelector('.genre-modal-backdrop');
    this.modalCloseBtn = this.container.querySelector('.genre-modal-close');
    this.modalDoneBtn = this.container.querySelector('.genre-modal-done');
    this.searchInput = this.container.querySelector('.genre-modal-search-input');
    this.optionsEl = this.container.querySelector('.genre-modal-options');

    this.toggleBtn?.addEventListener('click', () => this.openModal());
    this.modalBackdrop?.addEventListener('click', () => this.closeModal());
    this.modalCloseBtn?.addEventListener('click', () => this.closeModal());
    this.modalDoneBtn?.addEventListener('click', () => this.closeModal());
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (/** @type {HTMLInputElement} */ (e.target)).value.trim().toLowerCase();
      this.renderOptions();
    });
    this.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
      if (e.key === 'Escape') this.closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.closeModal();
      }
    });

    this.renderOptions();
    this.renderChips();
  }

  /**
   * @returns {boolean}
   */
  isOpen() {
    return this.modal?.style.display !== 'none';
  }

  /**
   * Open the modal.
   */
  openModal() {
    if (!this.modal || !this.searchInput) return;
    this.searchQuery = '';
    this.searchInput.value = '';
    this.renderOptions();
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.searchInput?.focus(), 10);
  }

  /**
   * Close the modal.
   */
  closeModal() {
    if (this.modal) this.modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
   * Render the checkbox list of available genres (filtered by search).
   */
  renderOptions() {
    if (!this.optionsEl) return;

    const filtered = this.searchQuery
      ? this.allGenres.filter(g => g.toLowerCase().includes(this.searchQuery))
      : this.allGenres;

    if (filtered.length === 0) {
      this.optionsEl.innerHTML = '<div class="genre-empty">No hay géneros disponibles.</div>';
      return;
    }

    this.optionsEl.innerHTML = filtered.map(genre => `
      <label class="genre-option">
        <input type="checkbox" value="${escapeHtml(genre)}" ${this.selected.has(genre) ? 'checked' : ''}>
        <span>${escapeHtml(genre)}</span>
      </label>
    `).join('');

    for (const checkbox of this.optionsEl.querySelectorAll('input[type="checkbox"]')) {
      checkbox.addEventListener('change', () => this.handleToggle(checkbox.value, checkbox.checked));
    }
  }

  /**
   * Render selected genre chips.
   */
  renderChips() {
    if (!this.chipsEl) return;

    const selected = [...this.selected];
    if (selected.length === 0) {
      this.chipsEl.innerHTML = '<span class="genre-placeholder">Ningún género seleccionado</span>';
      return;
    }

    this.chipsEl.innerHTML = selected.map(genre => `
      <span class="genre-chip">
        ${escapeHtml(genre)}
        <button type="button" class="genre-chip-remove" data-genre="${escapeHtml(genre)}" aria-label="Eliminar ${escapeHtml(genre)}">×</button>
      </span>
    `).join('');

    for (const btn of this.chipsEl.querySelectorAll('.genre-chip-remove')) {
      btn.addEventListener('click', () => this.handleToggle(btn.dataset.genre, false));
    }
  }

  /**
   * Toggle a genre selection.
   * @param {string} genre
   * @param {boolean} selected
   */
  handleToggle(genre, selected) {
    if (selected) {
      this.selected.add(genre);
    } else {
      this.selected.delete(genre);
    }
    this.sync();
  }

  /**
   * Add a new genre to the available list and select it.
   */
  handleAddGenre() {
    const value = this.searchInput?.value.trim();
    if (!value) return;

    const normalized = value.replace(/\s+/g, ' ');
    if (!this.allGenres.includes(normalized)) {
      this.allGenres.push(normalized);
      this.allGenres.sort((a, b) => a.localeCompare(b));
    }
    this.selected.add(normalized);
    this.sync();
  }

  /**
   * Sync the hidden input, chips, and toggle state.
   */
  sync() {
    const value = this.getValue();
    this.hiddenInput.value = value;
    this.renderOptions();
    this.renderChips();
    if (this.toggleBtn) {
      const count = this.selected.size;
      const text = this.toggleBtn.querySelector('.genre-toggle-text');
      if (text) text.textContent = count > 0 ? `${count} seleccionado${count !== 1 ? 's' : ''}` : 'Seleccionar géneros';
    }
    if (this.onChange) {
      this.onChange([...this.selected]);
    }
  }

  /**
   * Get the joined genre value.
   * @returns {string}
   */
  getValue() {
    return [...this.selected].join(' / ');
  }

  /**
   * Set the selected genres from a joined string.
   * @param {string} value
   */
  setValue(value) {
    this.selected.clear();
    if (value) {
      for (const genre of value.split(' / ').map(g => g.trim()).filter(Boolean)) {
        this.selected.add(genre);
        if (!this.allGenres.includes(genre)) {
          this.allGenres.push(genre);
          this.allGenres.sort((a, b) => a.localeCompare(b));
        }
      }
    }
    this.sync();
  }

  /**
   * Replace the full list of available genres.
   * @param {string[]} genres
   */
  setGenres(genres) {
    this.allGenres = [...genres].sort((a, b) => a.localeCompare(b));
    for (const g of this.selected) {
      if (!this.allGenres.includes(g)) {
        this.selected.delete(g);
      }
    }
    this.sync();
  }
}
