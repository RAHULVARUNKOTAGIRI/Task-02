/**
 * constants.js
 * Central place for all application constants.
 * Avoids magic strings scattered across the codebase.
 */

/* Keys used to persist data in localStorage */
export const STORAGE_KEYS = Object.freeze({
  FORMS: 'ssfp_forms',
  POLLS: 'ssfp_polls',
  RESPONSES: 'ssfp_responses',
  VOTES: 'ssfp_votes',
  SUBMISSIONS: 'ssfp_submissions', // tracks which single-submission forms a user submitted
  SEEDED: 'ssfp_seeded', // one-time flag so sample data is only ever seeded once
});

/* Supported form field types */
export const FIELD_TYPES = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  DROPDOWN: 'dropdown',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  TEXTAREA: 'textarea',
});

/* Human readable labels for field types (used to build UI selectors) */
export const FIELD_TYPE_LABELS = Object.freeze({
  [FIELD_TYPES.TEXT]: 'Text',
  [FIELD_TYPES.NUMBER]: 'Number',
  [FIELD_TYPES.DATE]: 'Date',
  [FIELD_TYPES.DROPDOWN]: 'Dropdown',
  [FIELD_TYPES.RADIO]: 'Radio Button',
  [FIELD_TYPES.CHECKBOX]: 'Checkbox',
  [FIELD_TYPES.TEXTAREA]: 'Text Area',
});

/* Field types that require a list of options */
export const OPTION_FIELD_TYPES = Object.freeze([
  FIELD_TYPES.DROPDOWN,
  FIELD_TYPES.RADIO,
  FIELD_TYPES.CHECKBOX,
]);

/* Form submission types */
export const SUBMISSION_TYPES = Object.freeze({
  SINGLE: 'single',
  MULTIPLE: 'multiple',
});

export const SUBMISSION_TYPE_LABELS = Object.freeze({
  [SUBMISSION_TYPES.SINGLE]: 'Single Submission',
  [SUBMISSION_TYPES.MULTIPLE]: 'Multiple Submission',
});

/* Poll choice types */
export const POLL_TYPES = Object.freeze({
  SINGLE: 'single',
  MULTIPLE: 'multiple',
});

export const POLL_TYPE_LABELS = Object.freeze({
  [POLL_TYPES.SINGLE]: 'Single Choice',
  [POLL_TYPES.MULTIPLE]: 'Multiple Choice',
});

/* Active / Inactive status for forms & polls */
export const STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

export const STATUS_LABELS = Object.freeze({
  [STATUS.ACTIVE]: 'Active',
  [STATUS.INACTIVE]: 'Inactive',
});

/* Derived (not stored) label shown when an item's "active until" date passed */
export const EXPIRED_LABEL = 'Expired';

/* Filter options used across admin lists */
export const FILTERS = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

/* Toast notification variants */
export const TOAST_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
});

/* Reusable user-facing messages (no hardcoded strings in logic) */
export const MESSAGES = Object.freeze({
  ALREADY_SUBMITTED: 'You have already submitted this form.',
  FORM_SAVED: 'Form saved successfully.',
  FORM_DELETED: 'Form deleted.',
  FORM_SUBMITTED: 'Thank you! Your response has been recorded.',
  POLL_SAVED: 'Poll saved successfully.',
  POLL_DELETED: 'Poll deleted.',
  VOTE_RECORDED: 'Your vote has been recorded.',
  ALREADY_VOTED: 'You have already voted in this poll.',
  STATUS_UPDATED: 'Status updated.',
  CONFIRM_DELETE_FORM: 'Are you sure you want to delete this form? This cannot be undone.',
  CONFIRM_DELETE_POLL: 'Are you sure you want to delete this poll? This cannot be undone.',
  NO_FORMS: 'No forms available yet.',
  NO_POLLS: 'No polls available yet.',
  NO_ACTIVE_FORMS: 'There are no active forms right now.',
  NO_ACTIVE_POLLS: 'There are no active polls right now.',
  FIX_ERRORS: 'Please fix the highlighted errors before submitting.',
  NO_RESPONSES_EXPORT: 'There are no responses to export.',
  SELECT_VOTE_OPTION: 'Please select an option to vote.',
  NO_FORMS_MATCH: 'No forms match your search.',
  NO_POLLS_MATCH: 'No polls match your search.',
});

/* Field types that support option lists, exposed as a labelled map too */
export const DEFAULT_OPTION_COUNT = 2;
