/**
 * utils.js
 * Small, reusable, framework-free functions used across the whole app.
 */

import {
  TOAST_TYPES,
  STATUS,
  STATUS_LABELS,
  EXPIRED_LABEL,
  FILTERS,
} from './constants.js';

/**
 * Generate a reasonably unique id without external libraries.
 * @returns {string}
 */
export function generateId() {
  return (
    'id-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

/**
 * Declarative DOM element creation helper.
 * @param {string} tag - element tag name
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text] - textContent
 * @param {string} [options.html] - innerHTML (use sparingly)
 * @param {object} [options.attrs] - map of attribute -> value
 * @param {object} [options.dataset] - map of data-* keys -> value
 * @param {object} [options.on] - map of event -> handler
 * @param {Array<Node|string>} [options.children]
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  const { className, text, html, attrs, dataset, on, children } = options;

  if (className) el.className = className;
  if (text != null) el.textContent = text;
  if (html != null) el.innerHTML = html;

  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === false || value == null) return;
      el.setAttribute(key, value === true ? '' : value);
    });
  }

  if (dataset) {
    Object.entries(dataset).forEach(([key, value]) => {
      el.dataset[key] = value;
    });
  }

  if (on) {
    Object.entries(on).forEach(([event, handler]) => {
      el.addEventListener(event, handler);
    });
  }

  if (children) {
    children.forEach((child) => {
      if (child == null) return;
      el.append(typeof child === 'string' ? document.createTextNode(child) : child);
    });
  }

  return el;
}

/** Remove all child nodes from an element. */
export function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Toast notification system. Creates a container lazily and stacks messages.
 * @param {string} message
 * @param {string} [type] - one of TOAST_TYPES
 * @param {number} [duration] - ms before auto dismiss
 */
export function showToast(message, type = TOAST_TYPES.INFO, duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = createElement('div', { className: 'toast-container' });
    document.body.appendChild(container);
  }

  const toast = createElement('div', {
    className: `toast toast--${type}`,
    text: message,
  });

  container.appendChild(toast);

  // Force reflow so the entry animation runs.
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/**
 * Percentage helper used by poll results.
 * @param {number} part
 * @param {number} total
 * @returns {number} rounded percentage (0-100)
 */
export function calculatePercentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Format a date value as a date-only label (no time).
 * @param {string|number} value
 * @returns {string}
 */
export function formatDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Whether an item's "active until" date has passed.
 * An item stays active through the end of the chosen day.
 * @param {object} item - a form or poll config (may have `activeUntil`)
 * @returns {boolean}
 */
export function isExpired(item) {
  if (!item?.activeUntil) return false;
  const end = new Date(item.activeUntil);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
}

/**
 * Resolve the effective status of an item, combining the admin's manual
 * status with any scheduled expiry date. This is the single source of truth
 * for whether users can see/use a form or poll.
 * @param {object} item
 * @returns {string} STATUS.ACTIVE or STATUS.INACTIVE
 */
export function getEffectiveStatus(item) {
  if (item.status !== STATUS.ACTIVE) return STATUS.INACTIVE;
  return isExpired(item) ? STATUS.INACTIVE : STATUS.ACTIVE;
}

/**
 * Format an ISO date/time string into a readable label.
 * @param {string|number} value
 * @returns {string}
 */
export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Debounce a function - used for instant search inputs.
 * @param {Function} fn
 * @param {number} [wait]
 * @returns {Function}
 */
export function debounce(fn, wait = 250) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ----------------------------------------------------------------------------
 * Reusable list/card UI builders (used by the admin Forms & Polls sections)
 * -------------------------------------------------------------------------- */

/**
 * Apply a search term + status filter to a collection.
 * @param {Array<object>} items
 * @param {string} searchTerm
 * @param {string} filter - one of FILTERS
 * @param {(item: object) => string} getName - how to read the searchable name
 * @returns {Array<object>}
 */
export function applySearchAndFilter(items, searchTerm, filter, getName) {
  const term = searchTerm.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch = !term || getName(item).toLowerCase().includes(term);
    // Filter on the effective status so an expired item counts as inactive.
    const matchesFilter =
      filter === FILTERS.ALL || getEffectiveStatus(item) === filter;
    return matchesSearch && matchesFilter;
  });
}

/**
 * Render an empty-state paragraph into a container.
 * @param {HTMLElement} container
 * @param {string} message
 */
export function renderEmpty(container, message) {
  clearElement(container);
  container.appendChild(
    createElement('p', { className: 'empty-state', text: message })
  );
}

/**
 * Build a coloured status pill for a form/poll item. Shows a distinct
 * "Expired" state when the item is active but its schedule has lapsed.
 * @param {object} item - a form or poll config
 * @returns {HTMLElement}
 */
export function statusPill(item) {
  if (item.status === STATUS.ACTIVE && isExpired(item)) {
    return createElement('span', {
      className: 'pill pill--expired',
      text: EXPIRED_LABEL,
    });
  }
  return createElement('span', {
    className: `pill pill--${item.status}`,
    text: STATUS_LABELS[item.status],
  });
}

/**
 * Wrap a control with a caption label for editor grids.
 * @param {string} caption
 * @param {HTMLElement} control
 * @returns {HTMLElement}
 */
export function labeledBlock(caption, control) {
  return createElement('label', {
    className: 'labeled',
    children: [
      createElement('span', { className: 'labeled__caption', text: caption }),
      control,
    ],
  });
}

/**
 * Populate a filter <select> with All / Active / Inactive options.
 * @param {HTMLSelectElement} selectEl
 */
export function populateFilter(selectEl) {
  const options = [
    { value: FILTERS.ALL, label: 'All' },
    { value: FILTERS.ACTIVE, label: 'Active' },
    { value: FILTERS.INACTIVE, label: 'Inactive' },
  ];
  options.forEach(({ value, label }) => {
    selectEl.appendChild(
      createElement('option', { text: label, attrs: { value } })
    );
  });
}

/**
 * Build the standard Enable/Disable, Edit, Delete action button group
 * shared by form and poll cards.
 * @param {object} handlers
 * @param {boolean} handlers.isActive
 * @param {Function} handlers.onToggle
 * @param {Function} handlers.onEdit
 * @param {Function} handlers.onDelete
 * @returns {HTMLElement}
 */
export function cardActions({ isActive, onToggle, onEdit, onDelete }) {
  return createElement('div', {
    className: 'list-card__actions',
    children: [
      createElement('button', {
        className: 'btn btn--secondary btn--sm',
        text: isActive ? 'Disable' : 'Enable',
        attrs: { type: 'button' },
        on: { click: onToggle },
      }),
      createElement('button', {
        className: 'btn btn--secondary btn--sm',
        text: 'Edit',
        attrs: { type: 'button' },
        on: { click: onEdit },
      }),
      createElement('button', {
        className: 'btn btn--danger btn--sm',
        text: 'Delete',
        attrs: { type: 'button' },
        on: { click: onDelete },
      }),
    ],
  });
}
