/**
 * app.js
 * Shared bootstrap logic loaded on every page:
 *  - seeds sample data on first run
 *  - active navigation highlighting
 *  - a reusable modal + confirmation dialog
 */

import { createElement } from './utils.js';
import { seedIfEmpty } from './seed.js';

// Seed sample data on first load. Runs at module-evaluation time, which is
// before any page controller's init() executes, so lists are never empty.
seedIfEmpty();

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
    const cancelButton = createElement('button', {
      className: 'btn btn--secondary',
      text: 'Cancel',
      attrs: { type: 'button' },
      on: {
        click: () => {
          modal.close();
          resolve(false);
        },
      },
    });

    const confirmButton = createElement('button', {
      className: 'btn btn--danger',
      text: confirmText,
      attrs: { type: 'button' },
      on: {
        click: () => {
          modal.close();
          resolve(true);
        },
      },
    });

    const modal = openModal({
      title,
      content: createElement('p', { text: message }),
      actions: [cancelButton, confirmButton],
      onClose: () => resolve(false),
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
