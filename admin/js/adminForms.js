/**
 * adminForms.js
 * Everything about managing Forms in the admin console: listing, the
 * create/edit modal (backed by FormBuilder), and status/delete actions.
 *
 * Exposed as a factory so admin.js can own the shared state and DOM refs and
 * just ask this section to (re)render or open the create dialog.
 */

import {
  STATUS,
  STATUS_LABELS,
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  DEFAULT_SUBMISSION_LIMIT,
  TOAST_TYPES,
  MESSAGES,
} from '../../shared/js/constants.js';
import {
  getForms,
  saveForms,
  getResponses,
  saveResponses,
  getSubmissions,
  saveSubmissions,
} from '../../shared/js/storage.js';
import {
  createElement,
  clearElement,
  showToast,
  formatDate,
  formatDay,
  isExpired,
  getEffectiveStatus,
  applySearchAndFilter,
  renderEmpty,
  statusPill,
  labeledBlock,
  cardActions,
} from '../../shared/js/utils.js';
import { openModal, confirmAction } from '../../shared/js/app.js';
import { FormBuilder } from '../../shared/js/formBuilder.js';
import { validateFormConfig } from '../../shared/js/validator.js';

/**
 * Create the Forms section controller.
 * @param {object} config
 * @param {HTMLElement} config.listEl - container for the form cards
 * @param {() => string} config.getSearchTerm
 * @param {() => string} config.getFilter
 * @returns {{ render: Function, openCreate: Function }}
 */
export function createFormsSection({ listEl, getSearchTerm, getFilter }) {
  /** Render the forms list, grouped into Active and Inactive sections. */
  function render() {
    const responses = getResponses();
    const forms = applySearchAndFilter(
      getForms(),
      getSearchTerm(),
      getFilter(),
      (form) => form.name
    );

    if (!forms.length) {
      renderEmpty(listEl, MESSAGES.NO_FORMS);
      return;
    }

    clearElement(listEl);
    const active = forms.filter(
      (form) => getEffectiveStatus(form) === STATUS.ACTIVE
    );
    const inactive = forms.filter(
      (form) => getEffectiveStatus(form) !== STATUS.ACTIVE
    );

    if (active.length) {
      listEl.appendChild(renderGroup('Active', active, responses));
    }
    if (inactive.length) {
      listEl.appendChild(renderGroup('Inactive', inactive, responses));
    }
  }

  /**
   * Render a titled group of form cards.
   * @param {string} title
   * @param {Array<object>} group
   * @param {object} responses
   * @returns {HTMLElement}
   */
  function renderGroup(title, group, responses) {
    const cards = group.map((form) =>
      renderCard(form, responses[form.id]?.length ?? 0)
    );
    return createElement('section', {
      className: 'list-group',
      children: [
        createElement('h2', {
          className: 'list-group__title',
          text: `${title} · ${group.length}`,
        }),
        createElement('div', { className: 'list', children: cards }),
      ],
    });
  }

  /**
   * Render a single form as a card.
   * @param {object} form
   * @param {number} responseCount
   * @returns {HTMLElement}
   */
  function renderCard(form, responseCount) {
    // Schedule note: shows the expiry date, flagged when already lapsed.
    const scheduleNote = form.activeUntil
      ? createElement('span', {
          className: isExpired(form) ? 'schedule schedule--expired' : 'schedule',
          text: isExpired(form)
            ? `Expired on ${formatDay(form.activeUntil)}`
            : `Active until ${formatDay(form.activeUntil)}`,
        })
      : null;

    const meta = createElement('div', {
      className: 'list-card__meta',
      children: [
        createElement('h3', { className: 'list-card__title', text: form.name }),
        createElement('div', {
          className: 'list-card__sub',
          children: [
            statusPill(form),
            createElement('span', {
              text: SUBMISSION_TYPE_LABELS[form.submissionType],
            }),
            createElement('span', { text: `${form.fields.length} fields` }),
            createElement('span', { text: `${responseCount} responses` }),
            createElement('span', {
              text: `Created ${formatDate(form.createdAt)}`,
            }),
            scheduleNote,
          ],
        }),
      ],
    });

    const actions = cardActions({
      isActive: form.status === STATUS.ACTIVE,
      onToggle: () => toggleStatus(form.id),
      onEdit: () => openEditor(form),
      onDelete: () => remove(form.id),
    });

    // Let the admin open the collected responses for this form.
    actions.prepend(
      createElement('button', {
        className: 'btn btn--secondary btn--sm',
        text: `Responses (${responseCount})`,
        attrs: { type: 'button' },
        on: { click: () => openResponses(form) },
      })
    );

    return createElement('div', {
      className: 'list-card',
      children: [meta, actions],
    });
  }

  /**
   * Open a modal listing every response collected for a form as a table.
   * @param {object} form
   */
  function openResponses(form) {
    const list = getResponses()[form.id] ?? [];
    const content = list.length
      ? buildResponsesTable(form, list)
      : createElement('p', {
          className: 'empty-state',
          text: 'No responses have been submitted yet.',
        });

    const closeButton = createElement('button', {
      className: 'btn btn--secondary',
      text: 'Close',
      attrs: { type: 'button' },
      on: { click: () => modal.close() },
    });

    const modal = openModal({
      title: `Responses · ${form.name}`,
      content,
      actions: [closeButton],
    });
  }

  /**
   * Build a scrollable table of responses (one column per field).
   * @param {object} form
   * @param {Array<object>} list
   * @returns {HTMLElement}
   */
  function buildResponsesTable(form, list) {
    const headRow = createElement('tr', {
      children: [
        createElement('th', { text: '#' }),
        createElement('th', { text: 'Submitted' }),
        ...form.fields.map((field) =>
          createElement('th', { text: field.label })
        ),
      ],
    });

    const bodyRows = list.map((response, index) => {
      const cells = [
        createElement('td', { text: String(index + 1) }),
        createElement('td', { text: formatDate(response.submittedAt) }),
        ...form.fields.map((field) => {
          const value = response.values[field.id];
          const text = Array.isArray(value) ? value.join(', ') : value ?? '';
          return createElement('td', { text: text === '' ? '—' : text });
        }),
      ];
      return createElement('tr', { children: cells });
    });

    const table = createElement('table', {
      className: 'data-table',
      children: [
        createElement('thead', { children: [headRow] }),
        createElement('tbody', { children: bodyRows }),
      ],
    });

    return createElement('div', {
      className: 'table-wrap',
      children: [
        createElement('p', {
          className: 'table-summary',
          text: `${list.length} response${list.length === 1 ? '' : 's'}`,
        }),
        table,
      ],
    });
  }

  /**
   * Open the form builder modal for create or edit.
   * @param {object|null} [existing]
   */
  function openEditor(existing = null) {
    const nameInput = createElement('input', {
      className: 'form-control',
      attrs: {
        type: 'text',
        placeholder: 'e.g. Customer Feedback',
        value: existing?.name ?? '',
      },
    });

    const submissionSelect = createElement('select', {
      className: 'form-control',
      children: Object.values(SUBMISSION_TYPES).map((type) =>
        createElement('option', {
          text: SUBMISSION_TYPE_LABELS[type],
          attrs: {
            value: type,
            selected:
              type === (existing?.submissionType ?? SUBMISSION_TYPES.SINGLE),
          },
        })
      ),
    });

    const statusSelect = createElement('select', {
      className: 'form-control',
      children: Object.values(STATUS).map((status) =>
        createElement('option', {
          text: STATUS_LABELS[status],
          attrs: {
            value: status,
            selected: status === (existing?.status ?? STATUS.ACTIVE),
          },
        })
      ),
    });

    // Optional scheduled expiry: the form auto-deactivates after this date.
    const activeUntilInput = createElement('input', {
      className: 'form-control',
      attrs: { type: 'date', value: existing?.activeUntil ?? '' },
    });

    // Max submissions per user - only meaningful for the "Limited" type.
    const maxSubmissionsInput = createElement('input', {
      className: 'form-control',
      attrs: {
        type: 'number',
        min: '1',
        step: '1',
        value: existing?.maxSubmissions ?? DEFAULT_SUBMISSION_LIMIT,
      },
    });

    // Enable the max-submissions input only when Limited is selected.
    const syncMaxState = () => {
      maxSubmissionsInput.disabled =
        submissionSelect.value !== SUBMISSION_TYPES.LIMITED;
    };
    submissionSelect.addEventListener('change', syncMaxState);
    syncMaxState();

    const topRow = createElement('div', {
      className: 'editor-grid',
      children: [
        labeledBlock('Form Name', nameInput),
        labeledBlock('Submission Type', submissionSelect),
        labeledBlock('Max Submissions (Limited only)', maxSubmissionsInput),
        labeledBlock('Status', statusSelect),
        labeledBlock('Active Until (optional)', activeUntilInput),
      ],
    });

    const fieldsContainer = createElement('div', { className: 'builder__fields' });
    const builder = new FormBuilder(fieldsContainer, existing);

    const addFieldButton = createElement('button', {
      className: 'btn btn--primary btn--sm',
      text: '+ Add Field',
      attrs: { type: 'button' },
      on: { click: () => builder.addField() },
    });

    const content = createElement('div', {
      className: 'form-editor',
      children: [
        topRow,
        createElement('div', {
          className: 'builder__header',
          children: [createElement('h3', { text: 'Fields' }), addFieldButton],
        }),
        fieldsContainer,
      ],
    });

    const saveButton = createElement('button', {
      className: 'btn btn--primary',
      text: 'Save Form',
      attrs: { type: 'button' },
      on: {
        click: () => {
          const config = {
            ...builder.getConfig(),
            name: nameInput.value.trim(),
            submissionType: submissionSelect.value,
            maxSubmissions:
              submissionSelect.value === SUBMISSION_TYPES.LIMITED
                ? Math.max(1, Number(maxSubmissionsInput.value) || 1)
                : null,
            status: statusSelect.value,
            activeUntil: activeUntilInput.value || null,
          };
          if (save(config)) modal.close();
        },
      },
    });

    const cancelButton = createElement('button', {
      className: 'btn btn--secondary',
      text: 'Cancel',
      attrs: { type: 'button' },
      on: { click: () => modal.close() },
    });

    const modal = openModal({
      title: existing ? 'Edit Form' : 'Create Form',
      content,
      actions: [cancelButton, saveButton],
    });
  }

  /**
   * Persist a form config (create or update).
   * @param {object} config
   * @returns {boolean} whether the save succeeded
   */
  function save(config) {
    const problems = validateFormConfig(config);
    if (problems.length) {
      showToast(problems[0], TOAST_TYPES.ERROR);
      return false;
    }

    const forms = getForms();
    const index = forms.findIndex((form) => form.id === config.id);
    if (index >= 0) {
      forms[index] = config;
    } else {
      forms.push(config);
    }
    saveForms(forms);
    showToast(MESSAGES.FORM_SAVED, TOAST_TYPES.SUCCESS);
    render();
    return true;
  }

  /** Toggle a form between active and inactive. */
  function toggleStatus(formId) {
    const forms = getForms();
    const form = forms.find((item) => item.id === formId);
    if (!form) return;
    form.status = form.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
    saveForms(forms);
    showToast(MESSAGES.STATUS_UPDATED, TOAST_TYPES.INFO);
    render();
  }

  /** Delete a form and its associated data after confirmation. */
  async function remove(formId) {
    const confirmed = await confirmAction(MESSAGES.CONFIRM_DELETE_FORM);
    if (!confirmed) return;

    saveForms(getForms().filter((form) => form.id !== formId));

    // Cascade: drop this form's collected responses...
    const responses = getResponses();
    delete responses[formId];
    saveResponses(responses);

    // ...and its single-submission history so the count stays accurate.
    const submissions = getSubmissions();
    delete submissions[formId];
    saveSubmissions(submissions);

    showToast(MESSAGES.FORM_DELETED, TOAST_TYPES.SUCCESS);
    render();
  }

  return { render, openCreate: () => openEditor() };
}
