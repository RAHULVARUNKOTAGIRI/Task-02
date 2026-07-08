/**
 * app.js
 * Shared bootstrap logic loaded on every page:
 *  - active navigation highlighting
 *  - a reusable modal + confirmation dialog
 *
 * Note: sample data is NOT auto-loaded. The app starts empty; use the
 * "Load Sample Data" button on the home page to populate it on demand.
 */

import { createElement } from './utils.js';
import { loadFromStorage, saveToStorage, clearAllData } from './storage.js';
import { RESET_STORAGE_FLAG } from './constants.js';

// One-time cleanup: wipe any data left over from older builds that used to
// auto-seed, so a freshly opened site starts empty. Runs once per browser;
// after this, data only appears when the user loads samples or creates their
// own. (The flag itself is not a STORAGE_KEY, so clearing data won't reset it.)
if (!loadFromStorage(RESET_STORAGE_FLAG, false)) {
  clearAllData();
  saveToStorage(RESET_STORAGE_FLAG, true);
}

/**
 * Highlight the nav link matching the current page.
 * Links opt in with [data-nav] and an href pointing at the page.
 */
export function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const target = link.getAttribute('href');
    link.classList.toggle('is-active', target === currentPage);
  });
}

/* ----------------------------------------------------------------------------
 * Reusable modal component
 * -------------------------------------------------------------------------- */

let activeModal = null;

/**
 * Open a modal dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {HTMLElement} options.content - body content element
 * @param {Array<HTMLElement>} [options.actions] - footer buttons
 * @param {Function} [options.onClose]
 * @returns {{ close: Function }}
 */
export function openModal({ title, content, actions = [], onClose } = {}) {
  closeModal(); // only one modal at a time

  const closeButton = createElement('button', {
    className: 'modal__close btn btn--icon',
    text: '✕',
    attrs: { type: 'button', 'aria-label': 'Close dialog' },
    on: { click: () => close() },
  });

  const header = createElement('div', {
    className: 'modal__header',
    children: [
      createElement('h2', { className: 'modal__title', text: title }),
      closeButton,
    ],
  });

  const body = createElement('div', {
    className: 'modal__body',
    children: [content],
  });

  const footer = actions.length
    ? createElement('div', { className: 'modal__footer', children: actions })
    : null;

  const dialog = createElement('div', {
    className: 'modal__dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true' },
    children: [header, body, footer],
  });

  const overlay = createElement('div', {
    className: 'modal-overlay',
    children: [dialog],
    on: {
      click: (event) => {
        if (event.target === overlay) close();
      },
    },
  });

  function close() {
    overlay.classList.remove('modal-overlay--visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), {
      once: true,
    });
    document.removeEventListener('keydown', onKeydown);
    activeModal = null;
    onClose?.();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));
  document.addEventListener('keydown', onKeydown);

  activeModal = { close };
  return activeModal;
}

/** Close any open modal. */
export function closeModal() {
  activeModal?.close();
}

/**
 * Promise-based confirmation dialog used before destructive actions.
 * @param {string} message
 * @param {object} [options]
 * @param {string} [options.confirmText]
 * @param {string} [options.title]
 * @returns {Promise<boolean>}
 */
export function confirmAction(
  message,
  { confirmText = 'Delete', title = 'Please confirm' } = {}
) {
  return new Promise((resolve) => {
    // Record the choice, then close. onClose resolves with it exactly once, so
    // clicking Delete first sets `choice = true` before the modal closes, while
    // dismissing via overlay/Escape leaves it false.
    let choice = false;

    const cancelButton = createElement('button', {
      className: 'btn btn--secondary',
      text: 'Cancel',
      attrs: { type: 'button' },
      on: { click: () => modal.close() },
    });

    const confirmButton = createElement('button', {
      className: 'btn btn--danger',
      text: confirmText,
      attrs: { type: 'button' },
      on: {
        click: () => {
          choice = true;
          modal.close();
        },
      },
    });

    const modal = openModal({
      title,
      content: createElement('p', { text: message }),
      actions: [cancelButton, confirmButton],
      onClose: () => resolve(choice),
    });
  });
}

/** Initialise shared behaviour on DOM ready. */
export function initShell() {
  highlightActiveNav();
}

// Auto-run for pages that just need the shell without custom logic.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShell);
} else {
  initShell();
}
