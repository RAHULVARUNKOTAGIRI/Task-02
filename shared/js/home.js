/**
 * home.js
 * Controller for the landing page (index.html). Importing app.js runs the
 * shared shell (active-nav). Adds the "Load Sample Data" and "Clear All Data"
 * actions. The app never auto-loads anything - data only appears when the
 * user loads samples or creates their own.
 */

import { MESSAGES, TOAST_TYPES } from './constants.js';
import { showToast } from './utils.js';
import { confirmAction } from './app.js';
import { loadSampleData } from './seed.js';
import { clearAllData } from './storage.js';

const loadSampleButton = document.getElementById('loadSampleBtn');
const clearDataButton = document.getElementById('clearDataBtn');

/** Confirm, then (re)load the sample data everywhere. */
async function handleLoadSample() {
  const confirmed = await confirmAction(MESSAGES.CONFIRM_LOAD_SAMPLE, {
    confirmText: 'Load Sample Data',
    title: 'Load sample data',
  });
  if (!confirmed) return;

  loadSampleData();
  showToast(MESSAGES.SAMPLE_LOADED, TOAST_TYPES.SUCCESS);
}

/** Confirm, then wipe all forms, polls, responses and votes. */
async function handleClearData() {
  const confirmed = await confirmAction(MESSAGES.CONFIRM_CLEAR_DATA, {
    confirmText: 'Clear All Data',
    title: 'Clear all data',
  });
  if (!confirmed) return;

  clearAllData();
  showToast(MESSAGES.DATA_CLEARED, TOAST_TYPES.SUCCESS);
}

loadSampleButton?.addEventListener('click', handleLoadSample);
clearDataButton?.addEventListener('click', handleClearData);
