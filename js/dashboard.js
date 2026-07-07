/**
 * dashboard.js
 * Controller for dashboard.html. Computes live statistics from storage and
 * renders a summary banner, stat cards, and pie/bar charts.
 */

import { STATUS, STORAGE_KEYS } from './constants.js';
import { getForms, getPolls, getResponses, getVotes } from './storage.js';
import {
  createElement,
  clearElement,
  formatDate,
  getEffectiveStatus,
} from './utils.js';
import { renderPieChart, renderBarChart } from './charts.js';

/* Cached DOM references. */
const elements = {
  bannerValue: document.getElementById('bannerValue'),
  bannerMeta: document.getElementById('bannerMeta'),
  statsGrid: document.getElementById('statsGrid'),
  pieChart: document.getElementById('pieChart'),
  barChart: document.getElementById('barChart'),
  refreshedAt: document.getElementById('refreshedAt'),
};

/** Interval (ms) for the live auto refresh. */
const REFRESH_INTERVAL = 4000;

/* --------------------------------------------------------------------------
 * Statistics computation
 * ------------------------------------------------------------------------ */

/**
 * Compute all dashboard metrics from current storage state.
 * @returns {object}
 */
function computeStats() {
  const forms = getForms();
  const polls = getPolls();
  const responses = getResponses();
  const votes = getVotes();

  // Derive totals from the CURRENT forms/polls only, so orphaned data left by
  // a deleted form/poll never inflates the counts (self-healing).
  const totalResponses = forms.reduce(
    (sum, form) => sum + (responses[form.id]?.length ?? 0),
    0
  );

  const totalVotes = polls.reduce(
    (sum, poll) => sum + totalVotesForPoll(poll, votes),
    0
  );

  return {
    forms,
    polls,
    responses,
    votes,
    totalResponses,
    totalVotes,
    activeForms: forms.filter((form) => getEffectiveStatus(form) === STATUS.ACTIVE)
      .length,
    activePolls: polls.filter((poll) => getEffectiveStatus(poll) === STATUS.ACTIVE)
      .length,
    mostSubmittedForm: findMostSubmittedForm(forms, responses),
    highestVotedPoll: findHighestVotedPoll(polls, votes),
  };
}

/**
 * Determine the form with the most responses.
 * @param {Array<object>} forms
 * @param {object} responses
 * @returns {{ name: string, count: number }}
 */
function findMostSubmittedForm(forms, responses) {
  return forms.reduce(
    (best, form) => {
      const count = responses[form.id]?.length ?? 0;
      return count > best.count ? { name: form.name, count } : best;
    },
    { name: '—', count: 0 }
  );
}

/**
 * Determine the poll with the most total votes.
 * @param {Array<object>} polls
 * @param {object} votes
 * @returns {{ name: string, count: number }}
 */
function findHighestVotedPoll(polls, votes) {
  return polls.reduce(
    (best, poll) => {
      const pollVotes = votes[poll.id] ?? {};
      const count = Object.values(pollVotes).reduce(
        (sum, value) => sum + value,
        0
      );
      return count > best.count ? { name: poll.question, count } : best;
    },
    { name: '—', count: 0 }
  );
}

/**
 * Count total votes for a single poll.
 * @param {object} poll
 * @param {object} votes
 * @returns {number}
 */
function totalVotesForPoll(poll, votes) {
  return Object.values(votes[poll.id] ?? {}).reduce(
    (sum, count) => sum + count,
    0
  );
}

/* --------------------------------------------------------------------------
 * Rendering
 * ------------------------------------------------------------------------ */

/**
 * Build a single stat card element.
 * @param {object} card
 * @returns {HTMLElement}
 */
function renderStatCard({ label, value, icon, accent = 'primary' }) {
  return createElement('article', {
    className: `stat-card stat-card--${accent}`,
    children: [
      createElement('div', { className: 'stat-card__icon', text: icon }),
      createElement('div', {
        className: 'stat-card__body',
        children: [
          createElement('span', { className: 'stat-card__value', text: value }),
          createElement('span', { className: 'stat-card__label', text: label }),
        ],
      }),
    ],
  });
}

/** Render the summary banner. */
function renderBanner(stats) {
  if (elements.bannerValue) elements.bannerValue.textContent = stats.totalResponses;
  if (elements.bannerMeta) {
    elements.bannerMeta.textContent = `${stats.totalVotes} poll votes across ${stats.polls.length} polls`;
  }
}

/** Render the stat cards grid. */
function renderStatCards(stats) {
  const cards = [
    { label: 'Total Forms', value: stats.forms.length, icon: '📋', accent: 'primary' },
    { label: 'Total Polls', value: stats.polls.length, icon: '🗳️', accent: 'info' },
    { label: 'Total Responses', value: stats.totalResponses, icon: '✍️', accent: 'success' },
    { label: 'Total Votes', value: stats.totalVotes, icon: '👍', accent: 'violet' },
    { label: 'Active Forms', value: stats.activeForms, icon: '✅', accent: 'primary' },
    { label: 'Active Polls', value: stats.activePolls, icon: '📶', accent: 'info' },
    {
      label: `Most Submitted Form (${stats.mostSubmittedForm.count})`,
      value: stats.mostSubmittedForm.name,
      icon: '🏆',
      accent: 'warning',
    },
    {
      label: `Highest Voted Poll (${stats.highestVotedPoll.count})`,
      value: stats.highestVotedPoll.name,
      icon: '🔥',
      accent: 'danger',
    },
  ];

  clearElement(elements.statsGrid);
  cards.forEach((card) => elements.statsGrid.appendChild(renderStatCard(card)));
}

/** Render the pie and bar charts. */
function renderCharts(stats) {
  // Pie: distribution of responses across forms.
  const responsesByForm = stats.forms.map((form) => ({
    label: form.name,
    value: stats.responses[form.id]?.length ?? 0,
  }));

  clearElement(elements.pieChart);
  elements.pieChart.appendChild(renderPieChart(responsesByForm));

  // Bar: total votes per poll.
  const votesByPoll = stats.polls.map((poll) => ({
    label: poll.question,
    value: totalVotesForPoll(poll, stats.votes),
  }));

  clearElement(elements.barChart);
  elements.barChart.appendChild(renderBarChart(votesByPoll));
}

/** Recompute and re-render the whole dashboard. */
function renderDashboard() {
  const stats = computeStats();
  renderBanner(stats);
  renderStatCards(stats);
  renderCharts(stats);

  if (elements.refreshedAt) {
    elements.refreshedAt.textContent = `Updated ${formatDate(Date.now())}`;
  }
}

/* --------------------------------------------------------------------------
 * Init + live refresh
 * ------------------------------------------------------------------------ */

/** Attach event listeners. */
function bindEvents() {
  // Refresh when another tab changes storage (real cross-tab live updates).
  window.addEventListener('storage', (event) => {
    if (Object.values(STORAGE_KEYS).includes(event.key)) renderDashboard();
  });
}

/** Entry point for the dashboard page. */
function init() {
  bindEvents();
  renderDashboard();
  // Periodic refresh keeps the "live" dashboard current within a single tab.
  setInterval(renderDashboard, REFRESH_INTERVAL);
}

init();
