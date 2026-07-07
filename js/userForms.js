/**
 * userForms.js
 * User-facing Forms section: renders active forms as clean, fully dynamic
 * cards (submission rule + optional deadline), opens a generated form in a
 * modal, validates, and stores the response.
 *
 * Exposed as a factory so user.js owns the shared search state.
 */

import {
  STATUS,
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  TOAST_TYPES,
  MESSAGES,
} from './constants.js';
import {
  getForms,
  getResponses,
  saveResponses,
  getSubmissions,
  saveSubmissions,
} from './storage.js';
import {
  createElement,
  clearElement,
  showToast,
  generateId,
  getEffectiveStatus,
  formatDay,
} from './utils.js';
import { openModal } from './app.js';
import { renderForm, collectFormValues, showFormErrors } from './renderer.js';
import { validateForm } from './validator.js';

/**
 * Create the user Forms section controller.
 * @param {object} config
 * @param {HTMLElement} config.listEl - container for the form cards
 * @param {() => string} config.getSearchTerm
 * @returns {{ render: Function, countActive: Function }}
 */
export function createUserFormsSection({ listEl, getSearchTerm }) {
  /** All effectively-active forms (unfiltered) - used for the tab count. */
  const activeForms = () =>
    getForms().filter((form) => getEffectiveStatus(form) === STATUS.ACTIVE);

  /** Active forms narrowed by the current search term. */
  function visibleForms() {
    const term = getSearchTerm().trim().toLowerCase();
    return activeForms().filter(
      (form) => !term || form.name.toLowerCase().includes(term)
    );
  }

  /** Render the forms grid. */
  function render() {
    const forms = visibleForms();
    clearElement(listEl);

    if (!forms.length) {
      const message = getSearchTerm().trim()
        ? MESSAGES.NO_FORMS_MATCH
        : MESSAGES.NO_ACTIVE_FORMS;
      listEl.appendChild(
        createElement('p', { className: 'empty-state', text: message })
      );
      return;
    }

    const responses = getResponses();
    forms.forEach((form) => listEl.appendChild(renderTile(form, responses)));
  }

  /**
   * Render one form as a card. Everything shown is derived from the config.
   * @param {object} form
   * @param {object} responses
   * @returns {HTMLElement}
   */
  function renderTile(form, responses) {
    const isSingle = form.submissionType === SUBMISSION_TYPES.SINGLE;
    const alreadySubmitted = isSingle && Boolean(getSubmissions()[form.id]);
    const responseCount = responses[form.id]?.length ?? 0;

    const header = createElement('div', {
      className: 'tile__top',
      children: [
        createElement('span', { className: 'tile__icon', text: '📝' }),
        createElement('span', {
          className: 'pill pill--info',
          text: SUBMISSION_TYPE_LABELS[form.submissionType],
        }),
      ],
    });

    // Compact meta row: only small, relevant notes (no field-type chips).
    const notes = [];
    if (form.activeUntil) {
      notes.push(
        createElement('span', {
          className: 'tile__foot tile__foot--deadline',
          text: `⏳ Open until ${formatDay(form.activeUntil)}`,
        })
      );
    }
    if (!isSingle && responseCount) {
      notes.push(
        createElement('span', {
          className: 'tile__foot',
          text: `${responseCount} response${
            responseCount === 1 ? '' : 's'
          } so far`,
        })
      );
    }
    const footer = notes.length
      ? createElement('div', { className: 'tile__notes', children: notes })
      : null;

    const actionButton = createElement('button', {
      className: 'btn btn--primary btn--block',
      text: alreadySubmitted ? '✓ Already Submitted' : 'Open Form',
      attrs: { type: 'button', disabled: alreadySubmitted },
      on: { click: () => openForFilling(form) },
    });

    return createElement('article', {
      className: `tile${alreadySubmitted ? ' tile--done' : ''}`,
      children: [
        header,
        createElement('h3', { className: 'tile__title', text: form.name }),
        footer,
        actionButton,
      ],
    });
  }

  /**
   * Open a dynamically generated form in a modal for the user to fill.
   * @param {object} form
   */
  function openForFilling(form) {
    if (
      form.submissionType === SUBMISSION_TYPES.SINGLE &&
      getSubmissions()[form.id]
    ) {
      showToast(MESSAGES.ALREADY_SUBMITTED, TOAST_TYPES.WARNING);
      return;
    }

    const formEl = renderForm(form);

    const submitButton = createElement('button', {
      className: 'btn btn--primary',
      text: 'Submit',
      attrs: { type: 'button' },
      on: { click: () => handleSubmit(form, formEl, modal) },
    });

    const cancelButton = createElement('button', {
      className: 'btn btn--secondary',
      text: 'Cancel',
      attrs: { type: 'button' },
      on: { click: () => modal.close() },
    });

    const modal = openModal({
      title: form.name,
      content: formEl,
      actions: [cancelButton, submitButton],
    });
  }

  /**
   * Validate and persist a form submission.
   * @param {object} form
   * @param {HTMLFormElement} formEl
   * @param {{ close: Function }} modal
   */
  function handleSubmit(form, formEl, modal) {
    const values = collectFormValues(formEl, form);
    const { valid, errors } = validateForm(form, values);

    if (!valid) {
      showFormErrors(formEl, errors);
      showToast(MESSAGES.FIX_ERRORS, TOAST_TYPES.ERROR);
      return;
    }

    // Persist the response under its form id.
    const responses = getResponses();
    const bucket = responses[form.id] ?? [];
    bucket.push({ id: generateId(), submittedAt: Date.now(), values });
    responses[form.id] = bucket;
    saveResponses(responses);

    // Track single-submission forms so the user cannot submit twice.
    if (form.submissionType === SUBMISSION_TYPES.SINGLE) {
      const submissions = getSubmissions();
      submissions[form.id] = true;
      saveSubmissions(submissions);
    }

    showToast(MESSAGES.FORM_SUBMITTED, TOAST_TYPES.SUCCESS);
    modal.close();
    render();
  }

  return { render, countActive: () => activeForms().length };
}
