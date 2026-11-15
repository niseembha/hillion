import { normalize, searchRoster } from './game.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// The original roster interaction, isolated so world transitions cannot consume guesses.
export function mountRoster(form, guesses, onGuess) {
  const input = form.querySelector('input');
  const list = form.querySelector('[role="listbox"]');
  const submit = form.querySelector('[type="submit"]');
  const clear = form.querySelector('.clear-search');
  let selected = null, matches = [], active = -1;

  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
  function choose(person) {
    selected = person; input.value = person.name; submit.disabled = false; clear.hidden = false; close();
    document.querySelector('#announcer').textContent = `${person.name} selected. Submit your guess when ready.`;
  }
  function paint() {
    if (!input.value.trim()) { close(); return; }
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `roster-${active}`);
    else input.removeAttribute('aria-activedescendant');
    list.innerHTML = matches.length ? matches.slice(0, 6).map((person, i) => `<li role="option" id="roster-${i}" aria-selected="${i === active}" ${person.guessed ? 'aria-disabled="true"' : ''} class="roster-option ${i === active ? 'active' : ''} ${person.guessed ? 'already-guessed' : ''}" data-index="${i}"><span>${escape(person.name)}</span><small>${person.guessed ? 'Already guessed' : 'SENIOR'}</small></li>`).join('') + (matches.length > 6 ? '<li class="more-matches" role="presentation">Keep typing to narrow down</li>' : '') : '<li class="no-matches" role="presentation">No matching names. Try a first or last name.</li>';
    list.querySelectorAll('[data-index]').forEach(option => {
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => { const person = matches[Number(option.dataset.index)]; if (!person.guessed) choose(person); });
    });
    list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }
  function search() { matches = searchRoster(input.value, guesses); paint(); }
  input.addEventListener('input', () => { selected = null; active = -1; submit.disabled = true; clear.hidden = !input.value; search(); });
  input.addEventListener('focus', () => { if (input.value && !selected) search(); });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); event.stopPropagation(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!input.value) return;
      if (list.hidden) search();
      const visible = matches.slice(0, 6);
      if (!visible.some(person => !person.guessed)) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      do { active = (active + direction + visible.length) % visible.length; } while (visible[active].guessed);
      paint();
    }
    if (event.key === 'Enter' && !selected) {
      event.preventDefault();
      const person = active >= 0 ? matches[active] : matches.find(person => normalize(person.name) === normalize(input.value));
      if (person && !person.guessed) choose(person);
    }
  });
  clear.addEventListener('click', () => { selected = null; input.value = ''; submit.disabled = true; clear.hidden = true; close(); input.focus(); });
  form.addEventListener('submit', event => { event.preventDefault(); if (selected && normalize(input.value) === normalize(selected.name)) onGuess(selected.id); });
  input.focus({ preventScroll: true });
}
