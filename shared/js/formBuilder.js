/**
 * formBuilder.js
 * Interactive UI the Admin uses to compose a form configuration.
 * Manages an in-memory draft (fields, options, reordering) and can serialise
 * it back into a plain config object for storage.
 */

import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  OPTION_FIELD_TYPES,
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  STATUS,
} from './constants.js';
import { createElement, clearElement, generateId } from './utils.js';

export class FormBuilder {
  /**
   * @param {HTMLElement} container - element that hosts the fields list
   * @param {object} [initial] - existing form config for edit mode
   */
  constructor(container, initial = null) {
    this.container = container;
    // Working draft. Cloned so editing does not mutate stored data.
    this.draft = initial
      ? JSON.parse(JSON.stringify(initial))
      : {
          id: generateId(),
          name: '',
          submissionType: SUBMISSION_TYPES.SINGLE,
          status: STATUS.ACTIVE,
          fields: [],
          createdAt: Date.now(),
        };
    this.render();
  }

  /** Add a blank field to the draft and re-render. */
  addField() {
    this.draft.fields.push({
      id: generateId(),
      label: '',
      type: FIELD_TYPES.TEXT,
      required: false,
      options: [],
    });
    this.render();
  }

  /** Remove a field by id. */
  removeField(fieldId) {
    this.draft.fields = this.draft.fields.filter(
      (field) => field.id !== fieldId
    );
    this.render();
  }

  /**
   * Move a field up or down to support reordering.
   * @param {string} fieldId
   * @param {number} direction - -1 up, +1 down
   */
  moveField(fieldId, direction) {
    const fields = this.draft.fields;
    const index = fields.findIndex((field) => field.id === fieldId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    this.render();
  }

  /** Update a scalar property on a field, keeping options in sync with type. */
  updateField(fieldId, key, value) {
    const field = this.draft.fields.find((item) => item.id === fieldId);
    if (!field) return;
    field[key] = value;

    // When switching to an option-based type, seed two empty options.
    if (key === 'type') {
      if (OPTION_FIELD_TYPES.includes(value) && field.options.length === 0) {
        field.options = ['', ''];
        this.render();
      } else if (!OPTION_FIELD_TYPES.includes(value) && field.options.length) {
        field.options = [];
        this.render();
      }
    }
  }

  addOption(fieldId) {
    const field = this.draft.fields.find((item) => item.id === fieldId);
    if (!field) return;
    field.options.push('');
    this.render();
  }

  removeOption(fieldId, index) {
    const field = this.draft.fields.find((item) => item.id === fieldId);
    if (!field) return;
    field.options.splice(index, 1);
    this.render();
  }

  updateOption(fieldId, index, value) {
    const field = this.draft.fields.find((item) => item.id === fieldId);
    if (!field) return;
    field.options[index] = value;
  }

  /**
   * Serialise the current draft, trimming strings and empty options.
   * @returns {object} clean form config
   */
  getConfig() {
    return {
      ...this.draft,
      name: this.draft.name.trim(),
      fields: this.draft.fields.map((field) => ({
        ...field,
        label: field.label.trim(),
        options: OPTION_FIELD_TYPES.includes(field.type)
          ? field.options.map((optionText) => optionText.trim()).filter(Boolean)
          : [],
      })),
    };
  }

  /** Rebuild the entire fields UI from the draft. */
  render() {
    clearElement(this.container);

    if (!this.draft.fields.length) {
      this.container.appendChild(
        createElement('p', {
          className: 'builder__empty',
          text: 'No fields yet. Click "Add Field" to begin.',
        })
      );
      return;
    }

    this.draft.fields.forEach((field, index) => {
      this.container.appendChild(this.renderFieldRow(field, index));
    });
  }

  /**
   * Render a single editable field row.
   * @param {object} field
   * @param {number} index
   * @returns {HTMLElement}
   */
  renderFieldRow(field, index) {
    const row = createElement('div', {
      className: 'field-row',
      dataset: { fieldId: field.id },
    });

    // Header: order controls + remove.
    const header = createElement('div', {
      className: 'field-row__header',
      children: [
        createElement('span', {
          className: 'field-row__index',
          text: `Field ${index + 1}`,
        }),
        createElement('div', {
          className: 'field-row__actions',
          children: [
            createElement('button', {
              className: 'btn btn--icon',
              text: '↑',
              attrs: { type: 'button', title: 'Move up' },
              on: { click: () => this.moveField(field.id, -1) },
            }),
            createElement('button', {
              className: 'btn btn--icon',
              text: '↓',
              attrs: { type: 'button', title: 'Move down' },
              on: { click: () => this.moveField(field.id, 1) },
            }),
            createElement('button', {
              className: 'btn btn--icon btn--danger',
              text: '✕',
              attrs: { type: 'button', title: 'Remove field' },
              on: { click: () => this.removeField(field.id) },
            }),
          ],
        }),
      ],
    });

    // Label input.
    const labelInput = createElement('input', {
      className: 'form-control',
      attrs: { type: 'text', placeholder: 'Field label', value: field.label },
      on: {
        input: (event) =>
          this.updateField(field.id, 'label', event.target.value),
      },
    });

    // Type selector built from FIELD_TYPES so nothing is hardcoded.
    const typeSelect = createElement('select', {
      className: 'form-control',
      children: Object.values(FIELD_TYPES).map((type) =>
        createElement('option', {
          text: FIELD_TYPE_LABELS[type],
          attrs: { value: type, selected: type === field.type },
        })
      ),
      on: {
        change: (event) =>
          this.updateField(field.id, 'type', event.target.value),
      },
    });

    // Required checkbox.
    const requiredToggle = createElement('label', {
      className: 'checkbox-inline',
      children: [
        createElement('input', {
          attrs: { type: 'checkbox', checked: field.required },
          on: {
            change: (event) =>
              this.updateField(field.id, 'required', event.target.checked),
          },
        }),
        createElement('span', { text: 'Required' }),
      ],
    });

    const controls = createElement('div', {
      className: 'field-row__controls',
      children: [
        this.labeled('Label', labelInput),
        this.labeled('Type', typeSelect),
        this.labeled(' ', requiredToggle),
      ],
    });

    row.append(header, controls);

    // Options editor only for option-based field types.
    if (OPTION_FIELD_TYPES.includes(field.type)) {
      row.appendChild(this.renderOptionsEditor(field));
    }

    return row;
  }

  /** Wrap a control with a small caption label. */
  labeled(caption, control) {
    return createElement('div', {
      className: 'labeled',
      children: [
        createElement('span', { className: 'labeled__caption', text: caption }),
        control,
      ],
    });
  }

  /**
   * Render the dynamic options list for a field.
   * @param {object} field
   * @returns {HTMLElement}
   */
  renderOptionsEditor(field) {
    const wrap = createElement('div', { className: 'options-editor' });
    wrap.appendChild(
      createElement('span', { className: 'options-editor__title', text: 'Options' })
    );

    field.options.forEach((option, index) => {
      const optionInput = createElement('input', {
        className: 'form-control',
        attrs: { type: 'text', placeholder: `Option ${index + 1}`, value: option },
        on: {
          input: (event) =>
            this.updateOption(field.id, index, event.target.value),
        },
      });

      const removeBtn = createElement('button', {
        className: 'btn btn--icon btn--danger',
        text: '✕',
        attrs: { type: 'button', title: 'Remove option' },
        on: { click: () => this.removeOption(field.id, index) },
      });

      wrap.appendChild(
        createElement('div', {
          className: 'options-editor__row',
          children: [optionInput, removeBtn],
        })
      );
    });

    wrap.appendChild(
      createElement('button', {
        className: 'btn btn--secondary btn--sm',
        text: '+ Add Option',
        attrs: { type: 'button' },
        on: { click: () => this.addOption(field.id) },
      })
    );

    return wrap;
  }
}

export { SUBMISSION_TYPES, SUBMISSION_TYPE_LABELS };
