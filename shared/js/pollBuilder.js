/**
 * pollBuilder.js
 * Interactive UI the Admin uses to compose a poll configuration.
 * Manages an in-memory draft (question, options, choice type, status).
 */

import {
  POLL_TYPES,
  POLL_TYPE_LABELS,
  STATUS,
  DEFAULT_OPTION_COUNT,
} from './constants.js';
import { createElement, clearElement, generateId } from './utils.js';

export class PollBuilder {
  /**
   * @param {HTMLElement} container - element that hosts the options list
   * @param {object|null} [initial] - existing poll config for edit mode
   */
  constructor(container, initial = null) {
    this.container = container;
    this.draft = initial
      ? JSON.parse(JSON.stringify(initial))
      : {
          id: generateId(),
          question: '',
          type: POLL_TYPES.SINGLE,
          status: STATUS.ACTIVE,
          options: Array.from({ length: DEFAULT_OPTION_COUNT }, () => ({
            id: generateId(),
            text: '',
          })),
          createdAt: Date.now(),
        };
    this.render();
  }

  /** Append a blank option. */
  addOption() {
    this.draft.options.push({ id: generateId(), text: '' });
    this.render();
  }

  /** Remove an option by its id. */
  removeOption(optionId) {
    this.draft.options = this.draft.options.filter(
      (option) => option.id !== optionId
    );
    this.render();
  }

  /** Update an option's text without a full re-render (keeps focus). */
  updateOption(optionId, text) {
    const option = this.draft.options.find((item) => item.id === optionId);
    if (option) option.text = text;
  }

  /**
   * Serialise the draft into a clean config, trimming and dropping blanks.
   * @returns {object}
   */
  getConfig() {
    return {
      ...this.draft,
      question: this.draft.question.trim(),
      options: this.draft.options
        .map((option) => ({ ...option, text: option.text.trim() }))
        .filter((option) => option.text),
    };
  }

  /** Rebuild the options list from the draft. */
  render() {
    clearElement(this.container);

    this.draft.options.forEach((option, index) => {
      const optionInput = createElement('input', {
        className: 'form-control',
        attrs: {
          type: 'text',
          placeholder: `Option ${index + 1}`,
          value: option.text,
        },
        on: {
          input: (event) => this.updateOption(option.id, event.target.value),
        },
      });

      const removeButton = createElement('button', {
        className: 'btn btn--icon btn--danger',
        text: '✕',
        attrs: { type: 'button', title: 'Remove option' },
        on: { click: () => this.removeOption(option.id) },
      });

      this.container.appendChild(
        createElement('div', {
          className: 'options-editor__row',
          children: [optionInput, removeButton],
        })
      );
    });

    this.container.appendChild(
      createElement('button', {
        className: 'btn btn--secondary btn--sm',
        text: '+ Add Option',
        attrs: { type: 'button' },
        on: { click: () => this.addOption() },
      })
    );
  }
}

export { POLL_TYPES, POLL_TYPE_LABELS };
