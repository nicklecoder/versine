import { el } from './dom.js';
import { fracInput } from './fracinput.js';
import { mixedInput } from './mixedinput.js';
import { choiceInput } from './choiceinput.js';
import { getType } from '../math/answer.js';

/**
 * The answer widget, chosen by the problem's answer type.
 *
 * Every widget presents the same small surface to the play screen, so the
 * screen never learns whether it is collecting an integer or a fraction:
 *
 *   node, value(), clear(), focus(), contains(el), setState('right'|'wrong'|null)
 *
 * No widget handles Enter for submission. The play screen owns that key, so a
 * single keypress can never both answer the problem and skip its own reveal.
 */

function intInput() {
  const input = el('input.answer', {
    type: 'text', inputmode: 'numeric', pattern: '-?[0-9]*', maxlength: 7,
    autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: '?',
    oninput: () => {
      const clean = input.value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
      if (clean !== input.value) input.value = clean;
    },
  });

  return {
    node: input,
    value: () => input.value,
    clear() { input.value = ''; },
    focus() { input.focus(); },
    contains: (element) => element === input,
    setState(state) {
      input.classList.remove('is-right', 'is-wrong');
      if (state) input.classList.add(`is-${state}`);
    },
  };
}

const WIDGETS = { int: intInput, frac: fracInput, mixed: mixedInput, choice: choiceInput };

/**
 * @param {string} answerType
 * @param {object} [spec] the problem's answer spec, for widgets that need it
 */
export function makeAnswerInput(answerType, spec) {
  const kind = getType(answerType).input;
  return (WIDGETS[kind] ?? intInput)(spec);
}
