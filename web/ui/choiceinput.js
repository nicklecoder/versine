import { el } from './dom.js';

/**
 * Pick one of a few.
 *
 * Exists for the questions that are about *judgement* rather than calculation
 * — which form to convert to, which method to reach for — where the answer is
 * a decision and typing it would be silly.
 *
 * Keyboard-first like everything else: number keys pick, arrows move, and
 * Enter is left alone because the play screen owns it.
 *
 * @param {{options: Array<{id:string, label:string, note?:string}>}} spec
 */
export function choiceInput(spec = {}) {
  const options = spec.options ?? [];
  let picked = null;

  const buttons = options.map((option, i) => {
    const btn = el('button.choice', { type: 'button', 'data-id': option.id },
      el('span.choice__key', {}, String(i + 1)),
      el('span.choice__body', {},
        el('span.choice__label', {}, option.label),
        option.note ? el('span.choice__note', {}, option.note) : null));
    btn.addEventListener('click', () => select(i));
    return btn;
  });

  function select(i) {
    if (i < 0 || i >= buttons.length) return;
    picked = options[i].id;
    buttons.forEach((b, n) => b.classList.toggle('is-picked', n === i));
    buttons[i].focus();
  }

  const onKey = (e) => {
    const digit = Number(e.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= buttons.length) {
      e.preventDefault();
      e.stopPropagation();
      select(digit - 1);
      return;
    }
    const at = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault(); e.stopPropagation();
      select(Math.min(at + 1, buttons.length - 1));
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault(); e.stopPropagation();
      select(Math.max(at - 1, 0));
    }
  };
  buttons.forEach((b) => b.addEventListener('keydown', onKey));

  const node = el('div.choices', {}, buttons);

  return {
    node,
    value: () => picked ?? '',
    clear() { picked = null; buttons.forEach((b) => b.classList.remove('is-picked')); },
    focus() { (buttons.find((b) => b.classList.contains('is-picked')) ?? buttons[0])?.focus(); },
    contains: (element) => buttons.includes(element),
    setState(state) {
      buttons.forEach((b) => {
        b.classList.remove('is-right', 'is-wrong');
        if (state && b.classList.contains('is-picked')) b.classList.add(`is-${state}`);
      });
    },
  };
}
