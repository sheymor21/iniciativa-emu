// @ts-check

/**
 * Custom multi-select genre picker.
 *
 * Builds a dropdown of checkboxes from a list of genre names, renders selected
 * genres as removable chips, and keeps a hidden input in sync with the joined
 * value (" / "). Also provides an inline "add genre" control.
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
        <div class="genre-dropdown" style="display:none;">
          <div class="genre-options"></div>
          <div class="genre-add">
            <input type="text" class="genre-add-input" placeholder="Nuevo género..." maxlength="50">
            <button type="button" class="genre-add-btn btn btn-primary">Agregar</button>
          </div>
        </div>
        <div class="genre-chips"></div>
      </div>
    `;

    this.toggleBtn = this.container.querySelector('.genre-toggle');
    this.dropdown = this.container.querySelector('.genre-dropdown');
    this.optionsEl = this.container.querySelector('.genre-options');
    this.chipsEl = this.container.querySelector('.genre-chips');
    this.addInput = this.container.querySelector('.genre-add-input');
    this.addBtn = this.container.querySelector('.genre-add-btn');

    this.toggleBtn?.addEventListener('click', () => this.toggleDropdown());
    this.addBtn?.addEventListener('click', () => this.handleAddGenre());
    this.addInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAddGenre();
      }
    });

    // Close dropdown when clicking outside.
    document.addEventListener('click', (e) => {
      if (!this.container.contains(/** @type {Node} */ (e.target))) {
        this.closeDropdown();
      }
    });

    this.renderOptions();
    this.renderChips();
  }

  /**
   * Render the checkbox list of available genres.
   */
  renderOptions() {
    if (!this.optionsEl) return;

    if (this.allGenres.length === 0) {
      this.optionsEl.innerHTML = '<div class="genre-empty">No hay géneros disponibles.</div>';
      return;
    }

    this.optionsEl.innerHTML = this.allGenres.map(genre => `
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
    const value = this.addInput?.value.trim();
    if (!value) return;

    const normalized = value.replace(/\s+/g, ' ');
    if (!this.allGenres.includes(normalized)) {
      this.allGenres.push(normalized);
      this.allGenres.sort((a, b) => a.localeCompare(b));
    }
    this.selected.add(normalized);
    if (this.addInput) this.addInput.value = '';
    this.sync();
  }

  /**
   * Sync the hidden input, chips, and dropdown state.
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
   * Open/close the dropdown.
   */
  toggleDropdown() {
    if (!this.dropdown) return;
    const isOpen = this.dropdown.style.display !== 'none';
    this.dropdown.style.display = isOpen ? 'none' : 'block';
    if (this.toggleBtn) {
      this.toggleBtn.classList.toggle('open', !isOpen);
    }
  }

  /**
   * Close the dropdown.
   */
  closeDropdown() {
    if (this.dropdown) this.dropdown.style.display = 'none';
    if (this.toggleBtn) this.toggleBtn.classList.remove('open');
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
    // Remove selected genres that no longer exist.
    for (const g of this.selected) {
      if (!this.allGenres.includes(g)) {
        this.selected.delete(g);
      }
    }
    this.sync();
  }
}
