/**
 * renderer.js
 * Turns a JSON form configuration into real DOM inputs and collects values
 * back out again. This is the "engine" that makes the platform
 * configuration-driven - no input HTML is ever hardcoded.
 */

import { FIELD_TYPES } from './constants.js';
import { createElement } from './utils.js';

/**
 * Build the DOM control(s) for a single field.
 * Each control is wired so its value can be read later via getFieldValue().
 * @param {object} field - field config
 * @returns {HTMLElement} wrapper element containing label + control
 */
export function renderInput(field) {
  const wrapper = createElement('div', {
    className: 'form-field',
    dataset: { fieldId: field.id, fieldType: field.type },
  });

  // Shared label (radio/checkbox groups use it as a group caption).
  const labelText = field.required ? `${field.label} *` : field.label;
  wrapper.appendChild(
    createElement('label', { className: 'form-field__label', text: labelText })
  );

  let control;

  switch (field.type) {
    case FIELD_TYPES.TEXT:
      control = createElement('input', {
        className: 'form-control',
        attrs: { type: 'text', 'data-input': '' },
      });
      break;

    case FIELD_TYPES.NUMBER:
      control = createElement('input', {
        className: 'form-control',
        attrs: { type: 'number', 'data-input': '' },
      });
      break;

    case FIELD_TYPES.DATE:
      control = createElement('input', {
        className: 'form-control',
        attrs: { type: 'date', 'data-input': '' },
      });
      break;

    case FIELD_TYPES.TEXTAREA:
      control = createElement('textarea', {
        className: 'form-control',
        attrs: { rows: '4', 'data-input': '' },
      });
      break;

    case FIELD_TYPES.DROPDOWN:
      control = createElement('select', {
        className: 'form-control',
        attrs: { 'data-input': '' },
        children: [
          createElement('option', {
            text: 'Select an option',
            attrs: { value: '' },
          }),
          ...field.options.map((optionText) =>
            createElement('option', {
              text: optionText,
              attrs: { value: optionText },
            })
          ),
        ],
      });
      break;

    case FIELD_TYPES.RADIO:
      control = renderChoiceGroup(field, 'radio');
      break;

    case FIELD_TYPES.CHECKBOX:
      control = renderChoiceGroup(field, 'checkbox');
      break;

    default:
      control = createElement('div', { text: `Unsupported field: ${field.type}` });
  }

  wrapper.appendChild(control);

  // Placeholder for an inline validation message.
  wrapper.appendChild(createElement('span', { className: 'form-field__error' }));

  return wrapper;
}

/**
 * Build a radio or checkbox group from a field's options.
 * @param {object} field
 * @param {'radio'|'checkbox'} inputType
 * @returns {HTMLElement}
 */
function renderChoiceGroup(field, inputType) {
  const group = createElement('div', { className: 'choice-group' });

  field.options.forEach((optionText) => {
    const input = createElement('input', {
      attrs: {
        type: inputType,
        name: field.id,
        value: optionText,
        'data-input': '',
      },
    });

    const choiceLabel = createElement('label', {
      className: 'choice',
      children: [input, createElement('span', { text: optionText })],
    });

    group.appendChild(choiceLabel);
  });

  return group;
}

/**
 * Render a complete form (all fields) into a container element.
 * @param {object} form - form config
 * @returns {HTMLFormElement}
 */
export function renderForm(form) {
  const formEl = createElement('form', {
    className: 'dynamic-form',
    attrs: { novalidate: '' },
    dataset: { formId: form.id },
  });

  form.fields.forEach((field) => formEl.appendChild(renderInput(field)));

  return formEl;
}

/**
 * Read the value of a single rendered field from the DOM.
 * @param {HTMLElement} wrapper - the .form-field element
 * @param {object} field - matching config
 * @returns {*} string, or array for checkbox groups
 */
export function getFieldValue(wrapper, field) {
  if (field.type === FIELD_TYPES.CHECKBOX) {
    return Array.from(
      wrapper.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.value);
  }

  if (field.type === FIELD_TYPES.RADIO) {
    const checked = wrapper.querySelector('input[type="radio"]:checked');
    return checked ? checked.value : '';
  }

  const control = wrapper.querySelector('[data-input]');
  return control ? control.value : '';
}

/**
 * Collect all values from a rendered form keyed by fieldId.
 * @param {HTMLFormElement} formEl
 * @param {object} form - config
 * @returns {object} map of fieldId -> value
 */
export function collectFormValues(formEl, form) {
  const values = {};
  form.fields.forEach((field) => {
    const wrapper = formEl.querySelector(`[data-field-id="${field.id}"]`);
    values[field.id] = wrapper ? getFieldValue(wrapper, field) : '';
  });
  return values;
}

/**
 * Display validation errors inline against their fields.
 * @param {HTMLFormElement} formEl
 * @param {object} errors - map of fieldId -> message
 */
export function showFormErrors(formEl, errors) {
  // Clear previous errors first.
  formEl.querySelectorAll('.form-field').forEach((wrapper) => {
    wrapper.classList.remove('form-field--error');
    const errorEl = wrapper.querySelector('.form-field__error');
    if (errorEl) errorEl.textContent = '';
  });

  Object.entries(errors).forEach(([fieldId, message]) => {
    const wrapper = formEl.querySelector(`[data-field-id="${fieldId}"]`);
    if (!wrapper) return;
    wrapper.classList.add('form-field--error');
    const errorEl = wrapper.querySelector('.form-field__error');
    if (errorEl) errorEl.textContent = message;
  });
}
