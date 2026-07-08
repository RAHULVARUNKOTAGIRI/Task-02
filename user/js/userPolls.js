/**
 * userPolls.js
 * User-facing Polls section: renders active polls with a voting UI, records
 * votes, and shows live results (per-option bars, percentages, the leading
 * option, and a marker on the option(s) this browser voted for).
 *
 * Exposed as a factory so user.js owns the shared search state.
 */

import {
  STATUS,
  POLL_TYPES,
  POLL_TYPE_LABELS,
  TOAST_TYPES,
  MESSAGES,
  VOTE_MARKERS,
} from '../../shared/js/constants.js';
import { getPolls, getVotes, saveVotes } from '../../shared/js/storage.js';
import {
  createElement,
  clearElement,
  showToast,
  calculatePercentage,
  getEffectiveStatus,
  formatDay,
} from '../../shared/js/utils.js';

/* Suffixes for the per-poll marker keys stored alongside vote tallies. */
const { VOTED: VOTED_FLAG, CHOICE: CHOICE_KEY } = VOTE_MARKERS;

/**
 * Create the user Polls section controller.
 * @param {object} config
 * @param {HTMLElement} config.listEl - container for the poll cards
 * @param {() => string} config.getSearchTerm
 * @returns {{ render: Function, countActive: Function }}
 */
export function createUserPollsSection({ listEl, getSearchTerm }) {
  /** All effectively-active polls (unfiltered) - used for the tab count. */
  const activePolls = () =>
    getPolls().filter((poll) => getEffectiveStatus(poll) === STATUS.ACTIVE);

  /**
   * Render the polls split into Active (votable) and Closed (results only)
   * sections, both narrowed by the current search term.
   */
  function render() {
    const term = getSearchTerm().trim().toLowerCase();
    const matches = (poll) =>
      !term || poll.question.toLowerCase().includes(term);

    const all = getPolls().filter(matches);
    const active = all.filter(
      (poll) => getEffectiveStatus(poll) === STATUS.ACTIVE
    );
    const closed = all.filter(
      (poll) => getEffectiveStatus(poll) !== STATUS.ACTIVE
    );

    clearElement(listEl);

    if (!active.length && !closed.length) {
      const message = term ? MESSAGES.NO_POLLS_MATCH : MESSAGES.NO_ACTIVE_POLLS;
      listEl.appendChild(
        createElement('p', { className: 'empty-state', text: message })
      );
      return;
    }

    if (active.length) {
      listEl.appendChild(renderSection('Active Polls', active, false));
    }
    if (closed.length) {
      listEl.appendChild(renderSection('Closed Polls', closed, true));
    }
  }

  /**
   * Render a titled section containing a list of poll cards.
   * @param {string} title
   * @param {Array<object>} polls
   * @param {boolean} closed - whether these polls are results-only
   * @returns {HTMLElement}
   */
  function renderSection(title, polls, closed) {
    const grid = createElement('div', {
      className: 'poll-list',
      children: polls.map((poll) => renderCard(poll, closed)),
    });
    return createElement('section', {
      className: 'user-section',
      children: [
        createElement('h2', {
          className: 'user-section__title',
          text: `${title} · ${polls.length}`,
        }),
        grid,
      ],
    });
  }

  /**
   * Render a poll card. Active polls allow voting (or show results once voted);
   * closed polls are results-only.
   * @param {object} poll
   * @param {boolean} [closed]
   * @returns {HTMLElement}
   */
  function renderCard(poll, closed = false) {
    const votes = getVotes();
    const hasVoted = Boolean(votes[`${poll.id}${VOTED_FLAG}`]);
    const totalVotes = countVotes(votes, poll.id);

    const header = createElement('div', {
      className: 'poll-card__head',
      children: [
        createElement('h3', {
          className: 'poll-card__question',
          text: poll.question,
        }),
        createElement('div', {
          className: 'poll-card__meta',
          children: [
            createElement('span', {
              className: closed ? 'pill pill--inactive' : 'pill pill--info',
              text: closed ? 'Closed' : POLL_TYPE_LABELS[poll.type],
            }),
            createElement('span', {
              className: 'poll-card__count',
              text: `${totalVotes} vote${totalVotes === 1 ? '' : 's'}`,
            }),
          ],
        }),
      ],
    });

    const card = createElement('article', {
      className: `poll-card${closed ? ' poll-card--closed' : ''}`,
      children: [header],
    });

    // Show the schedule note.
    if (poll.activeUntil) {
      card.appendChild(
        createElement('span', {
          className: 'poll-card__deadline',
          text: closed
            ? `Closed on ${formatDay(poll.activeUntil)}`
            : `⏳ Closes on ${formatDay(poll.activeUntil)}`,
        })
      );
    }

    // Closed polls are results-only; active polls allow voting until voted.
    if (closed || hasVoted) {
      card.appendChild(renderResults(poll));
    } else {
      card.appendChild(renderVotingForm(poll, card));
    }
    return card;
  }

  /**
   * Build the voting controls (radio or checkbox based on poll type).
   * @param {object} poll
   * @param {HTMLElement} card - replaced with results after voting
   * @returns {HTMLElement}
   */
  function renderVotingForm(poll, card) {
    const inputType = poll.type === POLL_TYPES.MULTIPLE ? 'checkbox' : 'radio';

    const optionsWrap = createElement('div', { className: 'choice-group' });
    poll.options.forEach((option) => {
      const input = createElement('input', {
        attrs: { type: inputType, name: `poll-${poll.id}`, value: option.id },
      });
      optionsWrap.appendChild(
        createElement('label', {
          className: 'choice',
          children: [input, createElement('span', { text: option.text })],
        })
      );
    });

    const hint = createElement('span', {
      className: 'poll-card__hint',
      text:
        poll.type === POLL_TYPES.MULTIPLE
          ? 'Select one or more options'
          : 'Select one option',
    });

    const voteButton = createElement('button', {
      className: 'btn btn--primary',
      text: 'Submit Vote',
      attrs: { type: 'button' },
      on: {
        click: () => {
          const selected = Array.from(
            optionsWrap.querySelectorAll('input:checked')
          ).map((input) => input.value);
          castVote(poll, selected, card);
        },
      },
    });

    return createElement('div', {
      className: 'poll-card__body',
      children: [optionsWrap, hint, voteButton],
    });
  }

  /**
   * Record a vote and swap the card body to show results.
   * @param {object} poll
   * @param {string[]} selectedOptionIds
   * @param {HTMLElement} card
   */
  function castVote(poll, selectedOptionIds, card) {
    if (!selectedOptionIds.length) {
      showToast(MESSAGES.SELECT_VOTE_OPTION, TOAST_TYPES.WARNING);
      return;
    }

    const votes = getVotes();
    const pollVotes = votes[poll.id] ?? {};
    selectedOptionIds.forEach((optionId) => {
      pollVotes[optionId] = (pollVotes[optionId] ?? 0) + 1;
    });
    votes[poll.id] = pollVotes;
    votes[`${poll.id}${VOTED_FLAG}`] = true; // mark this browser as having voted
    votes[`${poll.id}${CHOICE_KEY}`] = selectedOptionIds; // remember the pick(s)
    saveVotes(votes);

    showToast(MESSAGES.VOTE_RECORDED, TOAST_TYPES.SUCCESS);

    const body = card.querySelector('.poll-card__body');
    if (body) body.replaceWith(renderResults(poll));

    // Refresh the header vote count.
    const countEl = card.querySelector('.poll-card__count');
    if (countEl) {
      const total = countVotes(getVotes(), poll.id);
      countEl.textContent = `${total} vote${total === 1 ? '' : 's'}`;
    }
  }

  /**
   * Build the results view: bars, percentages, leading + "your vote" markers.
   * @param {object} poll
   * @returns {HTMLElement}
   */
  function renderResults(poll) {
    const votes = getVotes();
    const pollVotes = votes[poll.id] ?? {};
    const myChoices = votes[`${poll.id}${CHOICE_KEY}`] ?? [];
    const totalVotes = countVotes(votes, poll.id);

    // Highest tally decides which option(s) get the "leading" style.
    const maxVotes = Math.max(
      0,
      ...poll.options.map((option) => pollVotes[option.id] ?? 0)
    );

    const results = createElement('div', { className: 'poll-card__body' });

    poll.options.forEach((option) => {
      const optionVotes = pollVotes[option.id] ?? 0;
      const percentage = calculatePercentage(optionVotes, totalVotes);
      const isLeading = optionVotes > 0 && optionVotes === maxVotes;
      const isMine = myChoices.includes(option.id);

      const labelChildren = [
        createElement('span', {
          className: 'result-bar__label',
          text: option.text,
        }),
      ];
      if (isMine) {
        labelChildren.push(
          createElement('span', { className: 'tag-you', text: 'Your vote' })
        );
      }

      const bar = createElement('div', {
        className: `result-bar${isLeading ? ' result-bar--leading' : ''}`,
        children: [
          createElement('div', {
            className: 'result-bar__head',
            children: [
              createElement('div', {
                className: 'result-bar__labelwrap',
                children: labelChildren,
              }),
              createElement('span', {
                className: 'result-bar__value',
                text: `${optionVotes} · ${percentage}%`,
              }),
            ],
          }),
          createElement('div', {
            className: 'result-bar__track',
            children: [
              createElement('div', {
                className: 'result-bar__fill',
                attrs: { style: `width:${percentage}%` },
              }),
            ],
          }),
        ],
      });

      results.appendChild(bar);
    });

    results.appendChild(
      createElement('p', {
        className: 'poll-card__total',
        text: `${totalVotes} total vote${totalVotes === 1 ? '' : 's'}`,
      })
    );

    return results;
  }

  return { render, countActive: () => activePolls().length };
}

/**
 * Sum the vote tallies for a single poll.
 * @param {object} votes - full votes map
 * @param {string} pollId
 * @returns {number}
 */
function countVotes(votes, pollId) {
  return Object.values(votes[pollId] ?? {}).reduce(
    (sum, count) => sum + count,
    0
  );
}
