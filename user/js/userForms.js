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
} from '../../shared/js/constants.js';
import {
  getForms,
  getResponses,
  saveResponses,
  getSubmissions,
  saveSubmissions,
} from '../../shared/js/storage.js';
import {
  createElement,
  clearElement,
  showToast,
  generateId,
  getEffectiveStatus,
  submissionLimit,
  formatDay,
} from '../../shared/js/utils.js';
import { openModal } from '../../shared/js/app.js';
import { renderForm, collectFormValues, showFormErrors } from '../../shared/js/renderer.js';
import { validateForm } from '../../shared/js/validator.js';

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

  /**
   * Render the forms split into Active (fillable) and Closed (read-only)
   * sections, both narrowed by the current search term.
   */
  function render() {
    const term = getSearchTerm().trim().toLowerCase();
    const matches = (form) =>
      !term || form.name.toLowerCase().includes(term);

    const all = getForms().filter(matches);
    const active = all.filter(
      (form) => getEffectiveStatus(form) === STATUS.ACTIVE
    );
    const closed = all.filter(
      (form) => getEffectiveStatus(form) !== STATUS.ACTIVE
    );

    clearElement(listEl);

    if (!active.length && !closed.length) {
      const message = term ? MESSAGES.NO_FORMS_MATCH : MESSAGES.NO_ACTIVE_FORMS;
      listEl.appendChild(
        createElement('p', { className: 'empty-state', text: message })
      );
      return;
    }

    const responses = getResponses();
    if (active.length) {
      listEl.appendChild(renderSection('Active Forms', active, responses, false));
    }
    if (closed.length) {
      listEl.appendChild(renderSection('Closed Forms', closed, responses, true));
    }
  }

  /**
   * Render a titled section containing a grid of form tiles.
   * @param {string} title
   * @param {Array<object>} forms
   * @param {object} responses
   * @param {boolean} closed - whether these forms are read-only
   * @returns {HTMLElement}
   */
  function renderSection(title, forms, responses, closed) {
    const grid = createElement('div', {
      className: 'tile-grid',
      children: forms.map((form) => renderTile(form, responses, closed)),
    });
    return createElement('section', {
      className: 'user-section',
      children: [
        createElement('h2', {
          className: 'user-section__title',
          text: `${title} · ${forms.length}`,
        }),
        grid,
      ],
    });
  }

  /**
   * Render one form as a card. Everything shown is derived from the config.
   * @param {object} form
   * @param {object} responses
   * @returns {HTMLElement}
   */
  function renderTile(form, responses, closed = false) {
    const isSingle = form.submissionType === SUBMISSION_TYPES.SINGLE;
    const isLimited = form.submissionType === SUBMISSION_TYPES.LIMITED;
    const limit = submissionLimit(form);
    const submittedCount = getSubmissions()[form.id] ?? 0;
    const reachedLimit = submittedCount >= limit;
    const responseCount = responses[form.id]?.length ?? 0;

    const header = createElement('div', {
      className: 'tile__top',
      children: [
        createElement('span', { className: 'tile__icon', text: '📝' }),
        createElement('span', {
          className: closed ? 'pill pill--inactive' : 'pill pill--info',
          text: closed ? 'Closed' : SUBMISSION_TYPE_LABELS[form.submissionType],
        }),
      ],
    });

    // Compact meta row: only small, relevant notes (no field-type chips).
    const notes = [];
    if (closed && form.activeUntil) {
      notes.push(
        createElement('span', {
          className: 'tile__foot',
          text: `Closed on ${formatDay(form.activeUntil)}`,
        })
      );
    } else if (!closed && form.activeUntil) {
      notes.push(
        createElement('span', {
          className: 'tile__foot tile__foot--deadline',
          text: `⏳ Open until ${formatDay(form.activeUntil)}`,
        })
      );
    }
    // Limited forms show how many of the allowed submissions have been used.
    if (isLimited) {
      notes.push(
        createElement('span', {
          className: 'tile__foot',
          text: `You have used ${submittedCount} of ${limit} submissions`,
        })
      );
    } else if (form.submissionType === SUBMISSION_TYPES.MULTIPLE && responseCount) {
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

    // Decide the call-to-action based on closure and remaining submissions.
    let buttonText = 'Open Form';
    if (closed) {
      buttonText = 'Closed';
    } else if (reachedLimit) {
      buttonText = isSingle ? '✓ Already Submitted' : 'Limit Reached';
    } else if (isLimited) {
      buttonText = `Open Form (${limit - submittedCount} left)`;
    }

    const actionButton = createElement('button', {
      className: 'btn btn--primary btn--block',
      text: buttonText,
      attrs: { type: 'button', disabled: closed || reachedLimit },
      on: { click: () => openForFilling(form) },
    });

    const doneClass = !closed && reachedLimit ? ' tile--done' : '';
    const closedClass = closed ? ' tile--closed' : '';
    return createElement('article', {
      className: `tile${doneClass}${closedClass}`,
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
    // Enforce the per-user submission limit (1 for single, N for limited).
    const submittedCount = getSubmissions()[form.id] ?? 0;
    if (submittedCount >= submissionLimit(form)) {
      showToast(
        form.submissionType === SUBMISSION_TYPES.SINGLE
          ? MESSAGES.ALREADY_SUBMITTED
          : MESSAGES.LIMIT_REACHED,
        TOAST_TYPES.WARNING
      );
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

    // Record this browser's submission count per form. For single-submission
    // forms a truthy count also blocks re-submitting; for multiple forms it
    // powers the "My Activity" dashboard.
    const submissions = getSubmissions();
    submissions[form.id] = (submissions[form.id] ?? 0) + 1;
    saveSubmissions(submissions);

    showToast(MESSAGES.FORM_SUBMITTED, TOAST_TYPES.SUCCESS);
    modal.close();
    render();
  }

  return { render, countActive: () => activeForms().length };
}
