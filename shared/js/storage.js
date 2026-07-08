/**
 * storage.js
 * Thin wrapper around localStorage acting as the application's database.
 * All persistence goes through these helpers so the storage medium can be
 * swapped later without touching business logic.
 */

import { STORAGE_KEYS } from './constants.js';

/**
 * Save any serialisable value under a key.
 * @param {string} key
 * @param {*} value
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save "${key}" to storage`, err);
  }
}

/**
 * Load a value from storage, returning a fallback when missing/corrupt.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
export function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load "${key}" from storage`, err);
    return fallback;
  }
}

/**
 * Remove a key from storage.
 * @param {string} key
 */
export function removeFromStorage(key) {
  localStorage.removeItem(key);
}

/**
 * Remove every piece of application data (forms, polls, responses, votes,
 * submissions). Used by the home page "Clear All Data" action.
 */
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach((key) => removeFromStorage(key));
}

/* ----------------------------------------------------------------------------
 * Domain specific helpers. Each collection is stored as an array of objects.
 * -------------------------------------------------------------------------- */

export const getForms = () => loadFromStorage(STORAGE_KEYS.FORMS, []);
export const saveForms = (forms) => saveToStorage(STORAGE_KEYS.FORMS, forms);

export const getPolls = () => loadFromStorage(STORAGE_KEYS.POLLS, []);
export const savePolls = (polls) => saveToStorage(STORAGE_KEYS.POLLS, polls);

/** Responses keyed by formId -> array of response objects */
export const getResponses = () => loadFromStorage(STORAGE_KEYS.RESPONSES, {});
export const saveResponses = (responses) =>
  saveToStorage(STORAGE_KEYS.RESPONSES, responses);

/** Votes keyed by pollId -> { optionId: count } */
export const getVotes = () => loadFromStorage(STORAGE_KEYS.VOTES, {});
export const saveVotes = (votes) => saveToStorage(STORAGE_KEYS.VOTES, votes);

/**
 * Submission history for single-submission forms.
 * Structure: { [formId]: true } to mark that this browser already submitted.
 */
export const getSubmissions = () => loadFromStorage(STORAGE_KEYS.SUBMISSIONS, {});
export const saveSubmissions = (submissions) =>
  saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions);

/**
 * Find a single form by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getFormById = (id) => getForms().find((form) => form.id === id);

/**
 * Find a single poll by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getPollById = (id) => getPolls().find((poll) => poll.id === id);
