/**
 * home.js
 * Controller for the landing page (index.html). Importing app.js runs the
 * shared shell (one-time seed + active-nav). Adds the "Load Sample Data"
 * action, which resets forms, polls, responses and votes to the sample set.
 */

import { MESSAGES, TOAST_TYPES } from './constants.js';
import { showToast } from './utils.js';
import { confirmAction } from './app.js';
import { loadSampleData } from './seed.js';

const loadSampleButton = document.getElementById('loadSampleBtn');

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

loadSampleButton?.addEventListener('click', handleLoadSample);
