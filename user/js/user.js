/**
 * user.js
 * Thin controller for user.html. Owns the tab/search state and DOM refs,
 * and delegates rendering to the Forms and Polls section modules.
 */

import { STORAGE_KEYS } from '../../shared/js/constants.js';
import { debounce } from '../../shared/js/utils.js';
import { createUserFormsSection } from './userForms.js';
import { createUserPollsSection } from './userPolls.js';

/* Cached DOM references. */
const elements = {
  navButtons: document.querySelectorAll('[data-user-view]'),
  panels: document.querySelectorAll('[data-user-panel]'),
  formsList: document.getElementById('userFormsList'),
  pollsList: document.getElementById('userPollsList'),
  search: document.getElementById('userSearch'),
  formsCount: document.getElementById('formsCount'),
  pollsCount: document.getElementById('pollsCount'),
};

/* Shared UI state. */
const state = { view: 'forms', search: '' };

/* Section controllers read the search term from shared state via a getter. */
const formsSection = createUserFormsSection({
  listEl: elements.formsList,
  getSearchTerm: () => state.search,
});

const pollsSection = createUserPollsSection({
  listEl: elements.pollsList,
  getSearchTerm: () => state.search,
});

/** Re-render both sections (used on search changes). */
function renderAll() {
  formsSection.render();
  pollsSection.render();
}

/** Refresh the active counts shown in the tab labels. */
function updateCounts() {
  elements.formsCount.textContent = formsSection.countActive();
  elements.pollsCount.textContent = pollsSection.countActive();
}

/**
 * Switch between the Forms and Polls tabs.
 * @param {string} view
 */
function switchView(view) {
  state.view = view;
  elements.navButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.userView === view);
  });
  elements.panels.forEach((panel) => {
    panel.hidden = panel.dataset.userPanel !== view;
  });
}

/** Attach event listeners. */
function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.userView));
  });

  elements.search.addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value;
      renderAll();
    }, 200)
  );

  // Live-refresh when data changes in another tab (e.g. "Load Sample Data").
  window.addEventListener('storage', (event) => {
    if (Object.values(STORAGE_KEYS).includes(event.key)) {
      renderAll();
      updateCounts();
    }
  });
}

/** Entry point for the user page. */
function init() {
  bindEvents();
  switchView('forms');
  renderAll();
  updateCounts();
}

init();
