/**
 * seed.js
 * Populates localStorage with realistic sample data the first time the app
 * runs, so every page has something meaningful to show. Ids are fixed (not
 * generated) so responses and votes can reference fields/options reliably.
 *
 * Seeding only happens when there are no forms and no polls yet, so a user's
 * own data is never overwritten.
 */

import {
  FIELD_TYPES,
  SUBMISSION_TYPES,
  POLL_TYPES,
  STATUS,
  STORAGE_KEYS,
} from './constants.js';
import { loadFromStorage, saveToStorage } from './storage.js';

/* A fixed reference date so seeded timestamps look natural and stable. */
const BASE_TIME = new Date('2026-06-01T09:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

/* ---- Sample forms -------------------------------------------------------- */
const SAMPLE_FORMS = [
  {
    id: 'form-feedback',
    name: 'Customer Feedback Survey',
    submissionType: SUBMISSION_TYPES.SINGLE,
    status: STATUS.ACTIVE,
    activeUntil: null,
    createdAt: BASE_TIME,
    fields: [
      { id: 'fb-name', label: 'Full Name', type: FIELD_TYPES.TEXT, required: true, options: [] },
      { id: 'fb-email', label: 'Email Address', type: FIELD_TYPES.TEXT, required: true, options: [] },
      {
        id: 'fb-rating',
        label: 'Overall Rating',
        type: FIELD_TYPES.RADIO,
        required: true,
        options: ['Excellent', 'Good', 'Average', 'Poor'],
      },
      { id: 'fb-comments', label: 'Additional Comments', type: FIELD_TYPES.TEXTAREA, required: false, options: [] },
    ],
  },
  {
    id: 'form-event',
    name: 'Tech Meetup Registration',
    submissionType: SUBMISSION_TYPES.MULTIPLE,
    status: STATUS.ACTIVE,
    activeUntil: '2026-12-31',
    createdAt: BASE_TIME + DAY,
    fields: [
      { id: 'ev-name', label: 'Attendee Name', type: FIELD_TYPES.TEXT, required: true, options: [] },
      { id: 'ev-age', label: 'Age', type: FIELD_TYPES.NUMBER, required: false, options: [] },
      { id: 'ev-date', label: 'Preferred Date', type: FIELD_TYPES.DATE, required: true, options: [] },
      {
        id: 'ev-food',
        label: 'Food Preference',
        type: FIELD_TYPES.DROPDOWN,
        required: true,
        options: ['Veg', 'Non Veg', 'Vegan'],
      },
      {
        id: 'ev-sessions',
        label: 'Sessions to Attend',
        type: FIELD_TYPES.CHECKBOX,
        required: false,
        options: ['Keynote', 'Workshops', 'Networking'],
      },
    ],
  },
  {
    id: 'form-product',
    name: 'Product Interest Form',
    submissionType: SUBMISSION_TYPES.MULTIPLE,
    status: STATUS.INACTIVE,
    activeUntil: null,
    createdAt: BASE_TIME + 2 * DAY,
    fields: [
      {
        id: 'pr-product',
        label: 'Which product interests you?',
        type: FIELD_TYPES.DROPDOWN,
        required: true,
        options: ['Starter', 'Pro', 'Enterprise'],
      },
      {
        id: 'pr-contact',
        label: 'May we contact you?',
        type: FIELD_TYPES.RADIO,
        required: true,
        options: ['Yes', 'No'],
      },
    ],
  },
];

/* ---- Sample polls -------------------------------------------------------- */
const SAMPLE_POLLS = [
  {
    id: 'poll-feature',
    question: 'Which feature should we build next?',
    type: POLL_TYPES.SINGLE,
    status: STATUS.ACTIVE,
    activeUntil: null,
    createdAt: BASE_TIME,
    options: [
      { id: 'ft-dark', text: 'Dark Mode' },
      { id: 'ft-mobile', text: 'Mobile App' },
      { id: 'ft-dash', text: 'Dashboard' },
      { id: 'ft-api', text: 'API Access' },
    ],
  },
  {
    id: 'poll-days',
    question: 'Which days work best for the community meetup?',
    type: POLL_TYPES.MULTIPLE,
    status: STATUS.ACTIVE,
    activeUntil: '2026-12-31',
    createdAt: BASE_TIME + DAY,
    options: [
      { id: 'dy-mon', text: 'Monday' },
      { id: 'dy-wed', text: 'Wednesday' },
      { id: 'dy-fri', text: 'Friday' },
      { id: 'dy-weekend', text: 'Weekend' },
    ],
  },
  {
    id: 'poll-support',
    question: 'How would you rate our support experience?',
    type: POLL_TYPES.SINGLE,
    status: STATUS.INACTIVE,
    activeUntil: null,
    createdAt: BASE_TIME + 2 * DAY,
    options: [
      { id: 'sp-great', text: 'Great' },
      { id: 'sp-okay', text: 'Okay' },
      { id: 'sp-poor', text: 'Poor' },
    ],
  },
];

/* ---- Sample responses (keyed by formId) --------------------------------- */
const SAMPLE_RESPONSES = {
  'form-feedback': [
    {
      id: 'resp-1',
      submittedAt: BASE_TIME + 3 * DAY,
      values: {
        'fb-name': 'Priya Sharma',
        'fb-email': 'priya@example.com',
        'fb-rating': 'Excellent',
        'fb-comments': 'Loved the clean interface!',
      },
    },
    {
      id: 'resp-2',
      submittedAt: BASE_TIME + 3 * DAY + 3600000,
      values: {
        'fb-name': 'Arjun Mehta',
        'fb-email': 'arjun@example.com',
        'fb-rating': 'Good',
        'fb-comments': 'Works well, would like more themes.',
      },
    },
  ],
  'form-event': [
    {
      id: 'resp-3',
      submittedAt: BASE_TIME + 4 * DAY,
      values: {
        'ev-name': 'Kabir Rao',
        'ev-age': '27',
        'ev-date': '2026-06-20',
        'ev-food': 'Veg',
        'ev-sessions': ['Keynote', 'Workshops'],
      },
    },
    {
      id: 'resp-4',
      submittedAt: BASE_TIME + 4 * DAY + 7200000,
      values: {
        'ev-name': 'Neha Verma',
        'ev-age': '31',
        'ev-date': '2026-06-21',
        'ev-food': 'Vegan',
        'ev-sessions': ['Networking'],
      },
    },
    {
      id: 'resp-5',
      submittedAt: BASE_TIME + 5 * DAY,
      values: {
        'ev-name': 'Sameer Khan',
        'ev-age': '24',
        'ev-date': '2026-06-20',
        'ev-food': 'Non Veg',
        'ev-sessions': ['Keynote', 'Networking'],
      },
    },
  ],
};

/* ---- Sample votes (keyed by pollId -> { optionId: count }) -------------- */
const SAMPLE_VOTES = {
  'poll-feature': { 'ft-dark': 45, 'ft-mobile': 25, 'ft-dash': 20, 'ft-api': 10 },
  'poll-days': { 'dy-mon': 12, 'dy-wed': 28, 'dy-fri': 19, 'dy-weekend': 34 },
};

/**
 * Seed the sample data set exactly once, ever. A persistent "seeded" flag
 * ensures we never re-add samples after the user has started managing data -
 * so deleting the sample forms/polls makes them stay deleted across refreshes.
 * @returns {boolean} whether seeding happened
 */
export function seedIfEmpty() {
  // Already seeded once (even if the user later deleted everything) - do nothing.
  if (loadFromStorage(STORAGE_KEYS.SEEDED, false)) return false;

  // Mark as seeded up front so this only ever runs once.
  saveToStorage(STORAGE_KEYS.SEEDED, true);

  // If the user somehow already has data, respect it and skip the samples.
  const hasForms = (loadFromStorage(STORAGE_KEYS.FORMS, []) ?? []).length > 0;
  const hasPolls = (loadFromStorage(STORAGE_KEYS.POLLS, []) ?? []).length > 0;
  if (hasForms || hasPolls) return false;

  saveToStorage(STORAGE_KEYS.FORMS, SAMPLE_FORMS);
  saveToStorage(STORAGE_KEYS.POLLS, SAMPLE_POLLS);
  saveToStorage(STORAGE_KEYS.RESPONSES, SAMPLE_RESPONSES);
  saveToStorage(STORAGE_KEYS.VOTES, SAMPLE_VOTES);
  saveToStorage(STORAGE_KEYS.SUBMISSIONS, {});
  return true;
}
