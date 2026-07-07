/**
 * validator.js
 * Dynamic, configuration-driven validation.
 * Rules are derived entirely from each field's config - nothing hardcoded.
 */

import { FIELD_TYPES, OPTION_FIELD_TYPES } from './constants.js';

/**
 * Validate a single field's value against its configuration.
 * @param {object} field - field config { type, label, required, options }
 * @param {*} value - value collected from the DOM
 * @returns {string|null} error message or null when valid
 */
export function validateField(field, value) {
  const { type, required, label } = field;

  // Determine "emptiness" per type.
  const isEmpty =
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  // Required check applies to every type.
  if (required && isEmpty) {
    return `${label} is required.`;
  }

  // If optional and empty, nothing more to validate.
  if (isEmpty) return null;

  switch (type) {
    case FIELD_TYPES.NUMBER:
      if (Number.isNaN(Number(value))) {
        return `${label} must be a valid number.`;
      }
      break;

    case FIELD_TYPES.DATE: {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return `${label} must be a valid date.`;
      }
      break;
    }

    case FIELD_TYPES.DROPDOWN:
    case FIELD_TYPES.RADIO:
      // A selected value must be one of the configured options.
      if (!field.options.includes(value)) {
        return `Please select a valid option for ${label}.`;
      }
      break;

    case FIELD_TYPES.CHECKBOX:
      // Every checked value must belong to the configured options.
      if (!value.every((selected) => field.options.includes(selected))) {
        return `Please select valid options for ${label}.`;
      }
      break;

    default:
      break;
  }

  return null;
}

/**
 * Validate an entire form submission.
 * @param {object} form - form config with a `fields` array
 * @param {object} values - map of fieldId -> collected value
 * @returns {{ valid: boolean, errors: object }} errors keyed by fieldId
 */
export function validateForm(form, values) {
  const errors = {};

  form.fields.forEach((field) => {
    const error = validateField(field, values[field.id]);
    if (error) errors[field.id] = error;
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate the admin's form configuration before saving.
 * Ensures option-based fields actually have options, etc.
 * @param {object} form
 * @returns {string[]} list of human readable problems
 */
export function validateFormConfig(form) {
  const problems = [];

  if (!form.name || !form.name.trim()) {
    problems.push('Form name is required.');
  }

  if (!form.fields.length) {
    problems.push('Add at least one field.');
  }

  form.fields.forEach((field, index) => {
    const position = index + 1;
    if (!field.label || !field.label.trim()) {
      problems.push(`Field ${position}: label is required.`);
    }
    if (OPTION_FIELD_TYPES.includes(field.type)) {
      const validOptions = field.options.filter((option) => option.trim());
      if (validOptions.length < 2) {
        problems.push(
          `Field ${position} (${field.label || 'unnamed'}): add at least two options.`
        );
      }
    }
  });

  return problems;
}

/**
 * Validate the admin's poll configuration before saving.
 * @param {object} poll
 * @returns {string[]}
 */
export function validatePollConfig(poll) {
  const problems = [];

  if (!poll.question || !poll.question.trim()) {
    problems.push('Poll question is required.');
  }

  const validOptions = poll.options.filter(
    (option) => option.text && option.text.trim()
  );
  if (validOptions.length < 2) {
    problems.push('Add at least two poll options.');
  }

  return problems;
}
