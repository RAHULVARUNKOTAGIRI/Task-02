/**
 * adminPolls.js
 * Everything about managing Polls in the admin console: listing, the
 * create/edit modal (backed by PollBuilder), and status/delete actions.
 *
 * Exposed as a factory so admin.js can own the shared state and DOM refs.
 */

import {
  STATUS,
  STATUS_LABELS,
  POLL_TYPES,
  POLL_TYPE_LABELS,
  TOAST_TYPES,
  MESSAGES,
  VOTE_MARKERS,
} from '../../shared/js/constants.js';
import { getPolls, savePolls, getVotes, saveVotes } from '../../shared/js/storage.js';
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
} from '../../shared/js/utils.js';
import { openModal, confirmAction } from '../../shared/js/app.js';
import { PollBuilder } from '../../shared/js/pollBuilder.js';
import { validatePollConfig } from '../../shared/js/validator.js';

/**
 * Sum all votes recorded for a poll.
 * @param {object} votes - the full votes map
 * @param {string} pollId
 * @returns {number}
 */
function countVotes(votes, pollId) {
  return Object.values(votes[pollId] ?? {}).reduce(
    (sum, count) => sum + count,
    0
  );
}

/**
 * Create the Polls section controller.
 * @param {object} config
 * @param {HTMLElement} config.listEl - container for the poll cards
 * @param {() => string} config.getSearchTerm
 * @param {() => string} config.getFilter
 * @returns {{ render: Function, openCreate: Function }}
 */
export function createPollsSection({ listEl, getSearchTerm, getFilter }) {
  /** Render the polls list, grouped into Active and Inactive sections. */
  function render() {
    const votes = getVotes();
    const polls = applySearchAndFilter(
      getPolls(),
      getSearchTerm(),
      getFilter(),
      (poll) => poll.question
    );

    if (!polls.length) {
      renderEmpty(listEl, MESSAGES.NO_POLLS);
      return;
    }

    clearElement(listEl);
    const active = polls.filter(
      (poll) => getEffectiveStatus(poll) === STATUS.ACTIVE
    );
    const inactive = polls.filter(
      (poll) => getEffectiveStatus(poll) !== STATUS.ACTIVE
    );

    if (active.length) listEl.appendChild(renderGroup('Active', active, votes));
    if (inactive.length) {
      listEl.appendChild(renderGroup('Inactive', inactive, votes));
    }
  }

  /**
   * Render a titled group of poll cards.
   * @param {string} title
   * @param {Array<object>} group
   * @param {object} votes
   * @returns {HTMLElement}
   */
  function renderGroup(title, group, votes) {
    const cards = group.map((poll) =>
      renderCard(poll, countVotes(votes, poll.id))
    );
    return createElement('section', {
      className: 'list-group',
      children: [
        createElement('h2', {
          className: 'list-group__title',
          text: `${title} · ${group.length}`,
        }),
        createElement('div', { className: 'list', children: cards }),
      ],
    });
  }

  /**
   * Render a single poll as a card.
   * @param {object} poll
   * @param {number} totalVotes
   * @returns {HTMLElement}
   */
  function renderCard(poll, totalVotes) {
    // Schedule note: shows the expiry date, flagged when already lapsed.
    const scheduleNote = poll.activeUntil
      ? createElement('span', {
          className: isExpired(poll) ? 'schedule schedule--expired' : 'schedule',
          text: isExpired(poll)
            ? `Expired on ${formatDay(poll.activeUntil)}`
            : `Active until ${formatDay(poll.activeUntil)}`,
        })
      : null;

    const meta = createElement('div', {
      className: 'list-card__meta',
      children: [
        createElement('h3', {
          className: 'list-card__title',
          text: poll.question,
        }),
        createElement('div', {
          className: 'list-card__sub',
          children: [
            statusPill(poll),
            createElement('span', { text: POLL_TYPE_LABELS[poll.type] }),
            createElement('span', { text: `${poll.options.length} options` }),
            createElement('span', { text: `${totalVotes} votes` }),
            createElement('span', {
              text: `Created ${formatDate(poll.createdAt)}`,
            }),
            scheduleNote,
          ],
        }),
      ],
    });

    const actions = cardActions({
      isActive: poll.status === STATUS.ACTIVE,
      onToggle: () => toggleStatus(poll.id),
      onEdit: () => openEditor(poll),
      onDelete: () => remove(poll.id),
    });

    return createElement('div', {
      className: 'list-card',
      children: [meta, actions],
    });
  }

  /**
   * Open the poll builder modal for create or edit.
   * @param {object|null} [existing]
   */
  function openEditor(existing = null) {
    const questionInput = createElement('input', {
      className: 'form-control',
      attrs: {
        type: 'text',
        placeholder: 'e.g. Which feature should we build next?',
        value: existing?.question ?? '',
      },
    });

    const typeSelect = createElement('select', {
      className: 'form-control',
      children: Object.values(POLL_TYPES).map((type) =>
        createElement('option', {
          text: POLL_TYPE_LABELS[type],
          attrs: {
            value: type,
            selected: type === (existing?.type ?? POLL_TYPES.SINGLE),
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

    // Optional scheduled expiry: the poll auto-closes after this date.
    const activeUntilInput = createElement('input', {
      className: 'form-control',
      attrs: { type: 'date', value: existing?.activeUntil ?? '' },
    });

    const topRow = createElement('div', {
      className: 'editor-grid',
      children: [
        labeledBlock('Question', questionInput),
        labeledBlock('Choice Type', typeSelect),
        labeledBlock('Status', statusSelect),
        labeledBlock('Active Until (optional)', activeUntilInput),
      ],
    });

    const optionsContainer = createElement('div', {
      className: 'builder__options',
    });
    const builder = new PollBuilder(optionsContainer, existing);

    const content = createElement('div', {
      className: 'poll-editor',
      children: [
        topRow,
        createElement('h3', { text: 'Options' }),
        optionsContainer,
      ],
    });

    const saveButton = createElement('button', {
      className: 'btn btn--primary',
      text: 'Save Poll',
      attrs: { type: 'button' },
      on: {
        click: () => {
          const config = {
            ...builder.getConfig(),
            question: questionInput.value.trim(),
            type: typeSelect.value,
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
      title: existing ? 'Edit Poll' : 'Create Poll',
      content,
      actions: [cancelButton, saveButton],
    });
  }

  /**
   * Persist a poll config (create or update).
   * @param {object} config
   * @returns {boolean}
   */
  function save(config) {
    const problems = validatePollConfig(config);
    if (problems.length) {
      showToast(problems[0], TOAST_TYPES.ERROR);
      return false;
    }

    const polls = getPolls();
    const index = polls.findIndex((poll) => poll.id === config.id);
    if (index >= 0) {
      polls[index] = config;
    } else {
      polls.push(config);
    }
    savePolls(polls);
    showToast(MESSAGES.POLL_SAVED, TOAST_TYPES.SUCCESS);
    render();
    return true;
  }

  /** Toggle a poll between active and inactive. */
  function toggleStatus(pollId) {
    const polls = getPolls();
    const poll = polls.find((item) => item.id === pollId);
    if (!poll) return;
    poll.status = poll.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
    savePolls(polls);
    showToast(MESSAGES.STATUS_UPDATED, TOAST_TYPES.INFO);
    render();
  }

  /** Delete a poll and its associated votes after confirmation. */
  async function remove(pollId) {
    const confirmed = await confirmAction(MESSAGES.CONFIRM_DELETE_POLL);
    if (!confirmed) return;

    savePolls(getPolls().filter((poll) => poll.id !== pollId));

    // Cascade: drop this poll's vote tallies and per-browser markers.
    const votes = getVotes();
    delete votes[pollId];
    delete votes[`${pollId}${VOTE_MARKERS.VOTED}`];
    delete votes[`${pollId}${VOTE_MARKERS.CHOICE}`];
    saveVotes(votes);

    showToast(MESSAGES.POLL_DELETED, TOAST_TYPES.SUCCESS);
    render();
  }

  return { render, openCreate: () => openEditor() };
}
