import { el } from './dom.js';

/**
 * Numerator over denominator, stacked the way it is written on paper.
 *
 * Two boxes rather than one text field, because the notation is the thing
 * being learned. Keyboard-first: digits fill the numerator, `/` or Space or
 * Down moves to the denominator, Backspace on an empty denominator goes back.
 *
 * Enter is not handled here at all. It always means "submit", in every input
 * in the app, and the play screen owns it -- a widget that also submitted
 * would make one keypress both answer the problem and skip its own reveal.
 */
export function fracInput() {
  const box = (cls, placeholder) => el(`input.frac-box.${cls}`, {
    type: 'text', inputmode: 'numeric', maxlength: 4,
    autocomplete: 'off', spellcheck: 'false', placeholder,
    oninput: (e) => {
      const clean = e.target.value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
      if (clean !== e.target.value) e.target.value = clean;
    },
  });

  const num = box('frac-box--num', 'n');
  const den = box('frac-box--den', 'd');

  const onKey = (e) => {
    if (e.key === '/' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      den.focus();
      return;
    }
    if (e.key === 'Backspace' && e.target === den && den.value === '') {
      e.preventDefault();
      num.focus();
      num.setSelectionRange(num.value.length, num.value.length);
    }
    if (e.key === 'ArrowDown' && e.target === num) { e.preventDefault(); den.focus(); }
    if (e.key === 'ArrowUp' && e.target === den) { e.preventDefault(); num.focus(); }
  };
  num.addEventListener('keydown', onKey);
  den.addEventListener('keydown', onKey);

  const node = el('div.frac-input', {}, num, el('div.frac-bar'), den);

  return {
    node,
    /**
     * The two boxes as one string for the answer parser. A filled numerator
     * with an empty denominator is a whole number -- dividing fractions often
     * gives one, and making a child type "6/1" would be silly.
     */
    value: () => {
      if (num.value === '' && den.value === '') return '';
      if (den.value === '') return num.value;
      return `${num.value || '0'}/${den.value}`;
    },
    clear() { num.value = ''; den.value = ''; },
    focus() { num.focus(); },
    contains: (element) => element === num || element === den,
    setState(state) {
      for (const b of [num, den]) {
        b.classList.remove('is-right', 'is-wrong');
        if (state) b.classList.add(`is-${state}`);
      }
    },
  };
}
