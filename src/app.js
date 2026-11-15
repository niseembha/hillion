import { mystery } from './data.js';
import { initialState, transition, remaining, wrongCount, potential, searchRoster, normalize, shareText } from './game.js';

const app = document.querySelector('#app');
let state = initialState();
let selected = null;
let matches = [];
let activeOption = -1;
let draft = '';
let lastAction = '';
let revealTimers = [];
let shareMessage = '';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = value => String(value).padStart(2, '0');
const format = value => value.toLocaleString('en-US');
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const searchIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const folderIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3V6Z" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.5"/></svg>';
const announce = text => { document.querySelector('#announcer').textContent = text; };

function dispatch(action) {
  const next = transition(state, action);
  if (next === state) return;
  lastAction = action.type;
  state = next;
  if (action.type === 'RESET') { selected = null; draft = ''; shareMessage = ''; clearRevealTimers(); }
  if (action.type === 'GUESS') { selected = null; draft = ''; }
  render();
  if (state.phase === 'reveal') startReveal();
  if (action.type === 'START') {
    focusHeading();
    announce(`Investigation started. Clue one of seven. ${mystery.clues[0].text} Three guesses remaining.`);
  }
  if (action.type === 'NEXT') {
    const evidence = document.querySelector('.evidence-scroll');
    evidence.scrollTo({ top: evidence.scrollHeight, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    app.querySelector('[data-action="next"], [data-action="finish"]')?.focus({ preventScroll: true });
    announce(`Clue ${state.clues} of seven. ${mystery.clues[state.clues - 1].text} ${potential(state)} potential points.`);
  }
  if (action.type === 'GUESS' && !state.solved) {
    announce(`${state.guesses.at(-1).name} is not our mystery senior. ${remaining(state)} guesses remaining. ${potential(state)} potential points.`);
    document.querySelector('#senior-search')?.focus({ preventScroll: true });
  }
  if (action.type === 'RESET' || action.type === 'SPOTLIGHT') focusHeading();
}

function focusHeading() { app.querySelector('h1')?.focus({ preventScroll: true }); }
function render() {
  document.body.dataset.phase = state.phase;
  app.innerHTML = state.phase === 'intro' ? intro() : state.phase === 'playing' ? investigation() : state.phase === 'reveal' ? reveal() : spotlight();
  bindActions();
}

function intro() {
  return `<section class="intro-screen screen-enter">
    <div class="intro-copy"><div class="eyebrow intro-kicker"><span class="little-sun">✳</span> THE DAILY GREENHILL MYSTERY</div>
      <h1 tabindex="-1">You know the face.<br>But do you know<br><em>the story?</em><span class="title-star" aria-hidden="true">✧</span></h1>
      <p class="intro-tagline">Seven clues. One Greenhill senior.</p>
      <p class="intro-description">There’s a story hiding in your own hallways.<br>Follow the clues. Make the connection.<br> Discover someone a little differently.</p>
      <button class="primary-button start-button" data-action="start">Open today’s case ${arrow}</button>
      <div class="intro-details"><span>7 clues to uncover</span><i></i><span>3 chances to connect</span></div>
    </div>
    <div class="intro-scene" aria-hidden="true">
      <span class="scene-note top-note">A familiar face.<br>An unfamiliar story.<svg viewBox="0 0 90 60"><path d="M8 5c67-6 30 58 71 41m-10-8 11 8-10 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>
      <div class="closed-folder"><div class="folder-tab">GREENHILL / SENIOR STORIES</div><div class="folder-back"></div>
        <div class="peek-paper"><span>THE PERSON BEHIND THE CLUES</span><div class="mystery-mark">?<span>✧</span></div><div class="redacted-line"></div><div class="redacted-line short"></div></div>
        <div class="folder-front"><span class="folder-overline">DEPARTMENT OF EVERYDAY MYSTERIES</span><div class="case-label"><span class="eyebrow">TODAY’S MYSTERY</span><strong>Case No. ${mystery.number}</strong><span>ONE OF US. SEVEN LITTLE SECRETS.</span><div class="label-line"></div><div class="label-bottom"><span>IDENTITY: <b>UNDISCLOSED</b></span><span class="barcode">┃│║│┃║┃│║│┃</span></div></div><div class="confidential-stamp">CURIOUS MINDS ONLY</div><span class="folder-corner">H / ${mystery.classYear}</span></div>
        <div class="paperclip"></div>
      </div>
      <div class="case-badge"><span>NO.</span><strong>${mystery.number}</strong><span>THE FIRST CASE</span></div>
      <span class="scene-note bottom-note">Not a test.<br>Just a little curiosity.<span>↗</span></span>
      <span class="scene-spark spark-one">✳</span><span class="scene-spark spark-two">✧</span>
    </div>
  </section>`;
}

function investigation() {
  const attempts = remaining(state);
  const newestGuess = state.guesses.at(-1);
  return `<section class="investigation-screen ${lastAction === 'START' ? 'dossier-open' : ''}">
    <div class="case-topline"><span class="eyebrow">${folderIcon} CASE NO. ${mystery.number} <span class="topline-divider">/</span> <span class="muted">IDENTITY UNDISCLOSED</span></span><span class="handwritten">Every detail tells a story.</span></div>
    <div class="open-dossier"><div class="dossier-tab">THE EVIDENCE</div>
      <div class="dossier-main"><div class="dossier-heading"><div><span class="eyebrow">THE DAILY GREENHILL MYSTERY</span><h1 tabindex="-1">Someone you know.<br><em>Something you don’t.</em></h1></div><div class="points-ticket" aria-label="${attempts ? potential(state) + ' potential points' : 'No guesses remaining. Final score zero.'}"><span>${attempts ? 'ON THE TABLE' : 'FINAL SCORE'}</span><strong class="score-${state.clues}-${wrongCount(state)}">${format(attempts ? potential(state) : 0)}</strong><span>POINTS ${attempts ? '↗' : ''}</span></div></div>
        <div class="evidence-meta"><span class="eyebrow">CLUES UNCOVERED <b>${number(state.clues)} <span>/ 07</span></b></span><div class="clue-trail" aria-label="${state.clues} of 7 clues revealed">${mystery.clues.map((_, i) => `<span class="${i < state.clues ? 'uncovered' : ''} ${i === state.clues - 1 ? 'current' : ''}">${i < state.clues ? i + 1 : '·'}</span>`).join('')}</div></div>
        <div class="evidence-scroll" tabindex="0" aria-label="Revealed clues. Scroll to review all evidence."><ol class="evidence-list">${mystery.clues.slice(0, state.clues).map((clue, i) => `<li class="clue-card ${i === state.clues - 1 ? 'newest' : 'previous'} ${lastAction === 'NEXT' || lastAction === 'START' ? 'animate-clue' : ''}"><div class="clue-index">${number(i + 1)}<span>CLUE</span></div><div><span class="eyebrow clue-difficulty">${esc(clue.label)}</span><h2>${esc(clue.title)}</h2><p>“${esc(clue.text)}”</p></div>${i === state.clues - 1 ? '<span class="new-tag">NEW FIND</span>' : ''}</li>`).join('')}</ol>${state.clues === 1 ? '<div class="evidence-whisper"><span>↳</span> A very small detail. A very specific someone.<p>No idea yet? That’s part of the mystery.</p></div>' : ''}</div>
        <div class="next-clue-area">${state.clues < 7 ? `<button class="next-clue-button" data-action="next"><span class="next-icon">+</span><span>Uncover clue ${state.clues + 1}<small>${attempts ? `${format(Math.max(0, potential({ ...state, clues: state.clues + 1 })))} points on the next clue` : 'There’s still a story to discover'}</small></span>${arrow}</button><span class="no-pressure">Curiosity has no wrong answers.</span>` : `<div class="all-evidence"><span>✳</span><div><strong>That’s every piece of the puzzle.</strong><small>${attempts ? 'Make your connection, or meet the person behind it all.' : 'You followed the whole story. Now meet its author.'}</small></div></div><button class="finish-button" data-action="finish">${attempts ? 'Reveal senior · finish for 0 points' : 'Meet the mystery senior'} ${arrow}</button>`}</div>
      </div>
      <aside class="detective-notes"><div class="notes-tape"></div><span class="eyebrow">YOUR FIELD NOTES</span><h2>Ring any bells?</h2><p class="notes-description">Someone in these hallways fits the story. Follow your hunch.</p>
        <div class="attempts-section"><span class="eyebrow">GUESSES LEFT</span><div class="attempt-tokens" aria-label="${attempts} of 3 guesses remaining">${Array.from({ length: 3 }, (_, i) => `<span class="attempt-token ${i >= attempts ? 'used' : ''} ${lastAction === 'GUESS' && i === attempts ? 'just-used' : ''}" aria-hidden="true">${i >= attempts ? '×' : '✦'}</span>`).join('')}<span class="attempt-fraction">${attempts}<span>/ 3</span></span></div></div>
        ${attempts ? `<form id="guess-form" autocomplete="off"><label for="senior-search">Who’s your hunch?</label><div class="search-wrapper">${searchIcon}<input id="senior-search" name="senior" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="roster-options" aria-describedby="search-hint" placeholder="Search a senior’s name…" value="${esc(draft)}" spellcheck="false" autocapitalize="words"/><button type="button" class="clear-search ${draft ? '' : 'hidden'}" id="clear-search" aria-label="Clear selected name">×</button><ul id="roster-options" role="listbox" class="roster-options hidden" aria-label="Matching seniors"></ul></div><span id="search-hint" class="search-hint">Fictional roster · type to find a name</span><button class="primary-button guess-button" id="guess-button" ${selected ? '' : 'disabled'}>Make my guess ${arrow}</button></form>` : `<div class="out-of-guesses"><span>✉</span><strong>No more guesses.<br>Still more to the story.</strong><p>${state.clues < 7 ? 'Keep uncovering clues. Your senior spotlight is waiting after clue seven.' : 'Every clue is open. Your senior spotlight is ready.'}</p></div>`}
        <div class="guess-feedback ${lastAction === 'GUESS' && !state.solved ? 'feedback-enter' : ''}" role="status">${newestGuess ? `<span class="feedback-x">×</span><div><strong>A good hunch. A different story.</strong><p>${esc(newestGuess.name)} isn’t our senior. ${attempts ? 'Keep following the clues.' : 'Keep exploring the evidence.'}</p></div>` : '<div class="notes-tip"><span>↳</span> Start with a hunch.<br>Or let the clues come to you.</div>'}</div>
        ${state.guesses.length ? `<div class="previous-guesses"><span class="eyebrow">RULED OUT</span>${state.guesses.map(guess => `<span class="ruled-out">${esc(guess.name)} <span>×</span></span>`).join('')}</div>` : ''}
        <span class="notes-bottom">A familiar name is only the beginning.</span>
      </aside>
    </div><div class="desk-caption"><span>7 little clues. A whole person behind them.</span><span>TAKE YOUR TIME. GET CURIOUS.</span></div>
  </section>`;
}

function reveal() {
  return `<section class="reveal-screen" aria-label="Senior reveal"><button class="skip-button text-button" data-action="skip">Skip to spotlight ${arrow}</button><div class="reveal-label eyebrow">CASE NO. ${mystery.number} / INVESTIGATION COMPLETE</div><div class="reveal-stage" id="reveal-stage"><div class="gathering-papers">${Array.from({length:5},(_,i)=>`<div style="--paper:${i}"><span>CLUE ${number(i+1)}</span><i></i><i></i><i></i></div>`).join('')}</div><div class="reveal-folder"><span>HILLION / ${mystery.number}</span><div class="reveal-stamp">${state.solved ? 'CASE SOLVED' : 'STORY DISCOVERED'}</div></div><div class="identity-preview" id="identity-preview"></div></div><div class="reveal-caption" id="reveal-caption"><h1 tabindex="-1">${state.solved ? 'You made the connection.' : 'Every mystery has a person.'}</h1><p>Behind every clue, a story worth knowing.</p></div><div class="reveal-progress"><span></span></div></section>`;
}

function clearRevealTimers() { revealTimers.forEach(clearTimeout); revealTimers = []; }
function startReveal() {
  clearRevealTimers();
  if (reducedMotion.matches) { dispatch({ type: 'SPOTLIGHT' }); return; }
  focusHeading();
  announce(state.solved ? `Case solved! You earned ${state.score} points. The senior spotlight is beginning.` : 'Investigation complete. The senior spotlight is beginning.');
  revealTimers.push(setTimeout(() => { document.querySelector('#reveal-stage')?.classList.add('stamped'); }, 650));
  revealTimers.push(setTimeout(() => {
    if (state.phase !== 'reveal') return;
    document.querySelector('#identity-preview').innerHTML = `<div class="preview-photo"><img src="${mystery.portrait}" alt="Original illustrated portrait of fictional senior ${esc(mystery.name)}"/><span>${esc(mystery.name)}</span></div>`;
    document.querySelector('#reveal-stage').classList.add('identity');
    document.querySelector('#reveal-caption').innerHTML = `<span class="eyebrow">THE PERSON BEHIND THE CLUES</span><h1>${esc(mystery.name)}<span class="name-spark">✳</span></h1>`;
    announce(`Meet ${mystery.name}, our fictional senior.`);
  }, 1600));
  revealTimers.push(setTimeout(() => dispatch({ type: 'SPOTLIGHT' }), 3900));
}

function spotlight() {
  return `<section class="spotlight-screen screen-enter"><div class="spotlight-topline"><span class="eyebrow">${folderIcon} CASE NO. ${mystery.number} <span class="topline-divider">/</span> A STORY DISCOVERED</span><div class="small-stamp">${state.solved ? 'CASE SOLVED' : 'STORY DISCOVERED'}</div></div>
    <div class="spotlight-heading"><span class="eyebrow">THE SENIOR SPOTLIGHT</span><h1 tabindex="-1">Turns out, it’s <em>${esc(mystery.firstName)}.</em><span class="spotlight-spark">✳</span></h1><p>A familiar face. A few more reasons to say hello.</p></div>
    <div class="spotlight-layout"><div class="portrait-column"><figure class="portrait-print"><div class="portrait-tape"></div><img src="${mystery.portrait}" alt="Original illustration of fictional senior Maya Chen, wearing a green shirt and a purple streak in her hair"/><figcaption><strong>${esc(mystery.name)}</strong><span>GREENHILL / CLASS OF ${mystery.classYear}</span></figcaption></figure><span class="portrait-note">One of the people<br>who makes this place, this place. ♡</span></div>
      <div class="spotlight-story"><span class="eyebrow">A NOTE FROM ${esc(mystery.firstName).toUpperCase()}</span><blockquote>“${esc(mystery.quote)}”</blockquote><div class="signature">${esc(mystery.signature)}<strong>${esc(mystery.firstName)} <span>♡</span></strong></div><div class="interest-tags">${mystery.interests.map(interest=>`<span>${esc(interest)}</span>`).join('')}</div>
        <div class="result-slip"><div class="result-slip-header"><span class="eyebrow">YOUR CASE REPORT</span><span>#${mystery.number}</span></div><div class="result-numbers"><div><strong>${format(state.score)}<span> / 1,000</span></strong><span class="eyebrow">POINTS EARNED</span></div><div><strong>${state.solved ? state.clues : '—'}<span> / 7</span></strong><span class="eyebrow">${state.solved ? 'CLUES TO SOLVE' : 'CASE UNSOLVED'}</span></div><div><strong>${state.guesses.length}<span> / 3</span></strong><span class="eyebrow">GUESSES USED</span></div></div><p class="score-explanation">${state.solved ? `${format(potential(state))} points${wrongCount(state) ? ` after ${wrongCount(state)} incorrect guess${wrongCount(state)>1?'es':''} (−${wrongCount(state)*100})` : ' · a perfect trail of hunches'}. ${state.score === 0 ? 'You still found the story.' : 'Nicely investigated.'}` : 'No points this time. A new person to know a little better.'}</p><button class="primary-button share-button" data-action="share"><span>↗</span> Share your case report</button><span class="share-hint" id="share-status" role="status">${shareMessage || 'Bragging rights, without the spoilers.'}</span><div id="manual-share"></div></div>
      </div>
    </div>
    <div class="full-story"><div class="full-story-heading"><div><span class="eyebrow">THE COMPLETE CASE FILE</span><h2>Seven little things about ${esc(mystery.firstName)}.</h2></div><span class="handwritten">There’s always more to someone.</span></div><ol>${mystery.clues.map((clue,i)=>`<li><span class="fact-number">${number(i+1)}</span><div><span class="eyebrow">${esc(clue.label)} ${state.solved && i >= state.clues ? '<span class="bonus-fact">/ NOW YOU KNOW</span>':''}</span><p>${esc(clue.text)}</p></div></li>`).join('')}</ol></div>
    <div class="spotlight-bottom"><p>Same hallways. A whole new story.</p><button class="replay-button" data-action="reset">↻ Open the case again <span>Replay this fictional round</span></button></div>
  </section>`;
}

function bindActions() {
  app.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'share') { shareResults(); return; }
    if (action === 'skip') { clearRevealTimers(); dispatch({ type: 'SPOTLIGHT' }); return; }
    dispatch({ type: { start: 'START', next: 'NEXT', finish: 'FINISH', reset: 'RESET' }[action] });
  }));
  const input = document.querySelector('#senior-search');
  if (!input) return;
  input.addEventListener('input', () => {
    draft = input.value;
    selected = null;
    activeOption = -1;
    document.querySelector('#guess-button').disabled = true;
    document.querySelector('#clear-search').classList.toggle('hidden', !draft);
    updateOptions();
  });
  input.addEventListener('focus', () => { if (draft && !selected) updateOptions(); });
  input.addEventListener('blur', () => closeOptions());
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeOptions(); event.stopPropagation(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!draft) return;
      if (document.querySelector('#roster-options').classList.contains('hidden')) updateOptions();
      const available = matches.slice(0, 7);
      if (!available.some(person => !person.guessed)) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      do { activeOption = (activeOption + direction + available.length) % available.length; } while (available[activeOption].guessed);
      paintOptions();
    }
    if (event.key === 'Enter' && !selected) {
      event.preventDefault();
      const candidate = activeOption >= 0 ? matches[activeOption] : matches.find(person => normalize(person.name) === normalize(input.value));
      if (candidate && !candidate.guessed) choosePerson(candidate);
    }
  });
  document.querySelector('#clear-search').addEventListener('click', () => {
    draft = ''; selected = null; input.value = ''; document.querySelector('#guess-button').disabled = true;
    document.querySelector('#clear-search').classList.add('hidden'); closeOptions(); input.focus();
  });
  document.querySelector('#guess-form').addEventListener('submit', event => {
    event.preventDefault();
    if (selected && normalize(input.value) === normalize(selected.name)) dispatch({ type: 'GUESS', id: selected.id });
  });
}

function updateOptions() { matches = searchRoster(draft, state.guesses); paintOptions(); }
function paintOptions() {
  const list = document.querySelector('#roster-options');
  const input = document.querySelector('#senior-search');
  if (!draft.trim()) { closeOptions(); return; }
  list.classList.remove('hidden'); input.setAttribute('aria-expanded', 'true');
  if (activeOption >= 0) input.setAttribute('aria-activedescendant', `roster-option-${activeOption}`);
  else input.removeAttribute('aria-activedescendant');
  list.innerHTML = matches.length ? `${matches.slice(0,7).map((person,i)=>`<li id="roster-option-${i}" role="option" aria-selected="${activeOption===i}" ${person.guessed ? 'aria-disabled="true"' : ''} class="roster-option ${activeOption===i?'active':''} ${person.guessed?'already-guessed':''}" data-index="${i}"><span>${esc(person.name)}</span><small>${person.guessed?'Already guessed':'SENIOR'}</small></li>`).join('')}${matches.length>7?`<li role="presentation" class="more-matches">${matches.length-7} more · keep typing to narrow down</li>`:''}` : '<li role="presentation" class="no-matches">No matching seniors. Try a first or last name.</li>';
  list.querySelectorAll('[data-index]').forEach(option => {
    option.addEventListener('pointerdown', event => { event.preventDefault(); const person = matches[Number(option.dataset.index)]; if (!person.guessed) choosePerson(person); });
  });
  list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
}
function closeOptions() { document.querySelector('#roster-options')?.classList.add('hidden'); document.querySelector('#senior-search')?.setAttribute('aria-expanded','false'); document.querySelector('#senior-search')?.removeAttribute('aria-activedescendant'); activeOption=-1; }
function choosePerson(person) {
  selected=person; draft=person.name; document.querySelector('#senior-search').value=person.name;
  document.querySelector('#guess-button').disabled=false; document.querySelector('#clear-search').classList.remove('hidden'); closeOptions();
  announce(`${person.name} selected. Choose Make my guess to submit.`);
}

async function shareResults() {
  const text = shareText(state);
  const status = document.querySelector('#share-status');
  if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: `Hillion #${mystery.number}`, text }); status.textContent='Case report shared. The mystery stays a mystery.'; return; }
    catch(error) { if(error.name==='AbortError') { status.textContent='Share canceled. Your report is ready whenever you are.'; return; } }
  }
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    shareMessage='Copied! Send a little mystery to a friend.'; status.textContent=shareMessage;
  } catch {
    const area=document.createElement('textarea'); area.value=text; area.setAttribute('aria-label','Spoiler-free case report'); area.className='share-fallback';
    document.querySelector('#manual-share').replaceChildren(area); area.focus(); area.select();
    let copied=false;
    try { copied=document.execCommand('copy'); } catch { /* Manual selection remains available. */ }
    if(copied) { area.remove(); status.textContent='Copied! Send a little mystery to a friend.'; }
    else status.textContent='Copy the selected report below with ⌘C or Ctrl+C.';
  }
}

const help = document.querySelector('#help-dialog');
document.querySelector('#help-button').addEventListener('click', () => help.showModal());
help.querySelectorAll('.dialog-close, .dialog-close-button').forEach(button=>button.addEventListener('click',()=>help.close()));
help.addEventListener('click',event=>{ if(event.target===help){ const bounds=help.getBoundingClientRect(); if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)help.close(); } });
document.querySelector('#reset-button').addEventListener('click',()=>dispatch({type:'RESET'}));
render();
