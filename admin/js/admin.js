/**
 * admin.js
 * Thin controller for admin.html. Owns UI state and DOM references, wires up
 * the sidebar/toolbars, and delegates all Forms/Polls behaviour to the
 * dedicated section modules (adminForms.js / adminPolls.js).
 */

import { FILTERS, STORAGE_KEYS } from '../../shared/js/constants.js';
import { debounce, populateFilter } from '../../shared/js/utils.js';
import { createFormsSection } from './adminForms.js';
import { createPollsSection } from './adminPolls.js';

/* Cached DOM references (queried once). */
const elements = {
  navButtons: document.querySelectorAll('[data-view]'),
  views: document.querySelectorAll('[data-view-panel]'),
  formSearch: document.getElementById('formSearch'),
  formFilter: document.getElementById('formFilter'),
  formsList: document.getElementById('formsList'),
  createFormBtn: document.getElementById('createFormBtn'),
  pollSearch: document.getElementById('pollSearch'),
  pollFilter: document.getElementById('pollFilter'),
  pollsList: document.getElementById('pollsList'),
  createPollBtn: document.getElementById('createPollBtn'),
};

/* UI state kept in one object for clarity. */
const state = {
  view: 'forms',
  formSearch: '',
  formFilter: FILTERS.ALL,
  pollSearch: '',
  pollFilter: FILTERS.ALL,
};

/* Section controllers read their search/filter from shared state via getters. */
const formsSection = createFormsSection({
  listEl: elements.formsList,
  getSearchTerm: () => state.formSearch,
  getFilter: () => state.formFilter,
});

const pollsSection = createPollsSection({
  listEl: elements.pollsList,
  getSearchTerm: () => state.pollSearch,
  getFilter: () => state.pollFilter,
});

/**
 * Switch between the Forms and Polls views.
 * @param {string} view
 */
function switchView(view) {
  state.view = view;
  elements.navButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === view);
  });
  elements.views.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== view;
  });
}

/** Attach all event listeners for the admin page. */
function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  elements.createFormBtn.addEventListener('click', () =>
    formsSection.openCreate()
  );
  elements.createPollBtn.addEventListener('click', () =>
    pollsSection.openCreate()
  );

  elements.formSearch.addEventListener(
    'input',
    debounce((event) => {
      state.formSearch = event.target.value;
      formsSection.render();
    }, 200)
  );

  elements.formFilter.addEventListener('change', (event) => {
    state.formFilter = event.target.value;
    formsSection.render();
  });

  elements.pollSearch.addEventListener(
    'input',
    debounce((event) => {
      state.pollSearch = event.target.value;
      pollsSection.render();
    }, 200)
  );

  elements.pollFilter.addEventListener('change', (event) => {
    state.pollFilter = event.target.value;
    pollsSection.render();
  });

  // Live-refresh when data changes in another tab (e.g. "Load Sample Data").
  window.addEventListener('storage', (event) => {
    if (Object.values(STORAGE_KEYS).includes(event.key)) {
      formsSection.render();
      pollsSection.render();
    }
  });
}

/** Entry point for the admin page. */
function init() {
  populateFilter(elements.formFilter);
  populateFilter(elements.pollFilter);
  bindEvents();
  switchView('forms');
  formsSection.render();
  pollsSection.render();
}

init();
