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
  TOAST_TYPES,
  MESSAGES,
} from './constants.js';
import { getForms, saveForms, getResponses } from './storage.js';
import {
  createElement,
  clearElement,
  showToast,
  formatDate,
  formatDay,
  isExpired,
  applySearchAndFilter,
  renderEmpty,
  statusPill,
  labeledBlock,
  cardActions,
} from './utils.js';
import { openModal, confirmAction } from './app.js';
import { FormBuilder } from './formBuilder.js';
import { validateFormConfig } from './validator.js';

/**
 * Create the Forms section controller.
 * @param {object} config
 * @param {HTMLElement} config.listEl - container for the form cards
 * @param {() => string} config.getSearchTerm
 * @param {() => string} config.getFilter
 * @returns {{ render: Function, openCreate: Function }}
 */
export function createFormsSection({ listEl, getSearchTerm, getFilter }) {
  /** Render the forms list according to the current search/filter. */
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
    forms.forEach((form) => {
      const responseCount = responses[form.id]?.length ?? 0;
      listEl.appendChild(renderCard(form, responseCount));
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

    return createElement('div', {
      className: 'list-card',
      children: [meta, actions],
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

    const topRow = createElement('div', {
      className: 'editor-grid',
      children: [
        labeledBlock('Form Name', nameInput),
        labeledBlock('Submission Type', submissionSelect),
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

  /** Delete a form after confirmation. */
  async function remove(formId) {
    const confirmed = await confirmAction(MESSAGES.CONFIRM_DELETE_FORM);
    if (!confirmed) return;
    saveForms(getForms().filter((form) => form.id !== formId));
    showToast(MESSAGES.FORM_DELETED, TOAST_TYPES.SUCCESS);
    render();
  }

  return { render, openCreate: () => openEditor() };
}
