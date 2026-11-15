import { mystery } from "./data.js";
import { initialState, transition, remaining, potential } from "./game.js";
import { route } from "./route.js";
import { mountRoster } from "./roster-ui.js";
import { shareResults } from "./share.js";

const app = document.querySelector("#app");
const hud = document.querySelector("#hud");
const pin = document.querySelector("#discovery-pin");
const location = document.querySelector("#location-label");
const footer = document.querySelector("#journey-footer");
const help = document.querySelector("#help-dialog");
const history = document.querySelector("#history-dialog");
const announce = (text) =>
  (document.querySelector("#announcer").textContent = text);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const number = (value) => String(value).padStart(2, "0");
const format = (value) => value.toLocaleString("en-US");
const arrow =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';

let state = initialState();
let view = "loading";
let world;
let sequence = 0;
let readCount = 0;
let guessOpen = false;
let feedback = "";
let revealStage = "";
let calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealTimer;

function setView(next) {
  view = next;
  document.body.dataset.view = view;
  render();
}
function focusHeading() {
  app.querySelector("h1, h2")?.focus({ preventScroll: true });
}

function renderHUD() {
  const active = state.phase !== "intro" && view !== "loading";
  hud.hidden = !active;
  hud.innerHTML = active
    ? `<div class="hud-progress"><span class="hud-caption">CLUE</span><strong>${number(state.clues)}<span> / 07</span></strong><div class="hud-dots" aria-label="${readCount} clues collected">${route.map((_, i) => `<i class="${i < readCount ? "collected" : ""} ${i === state.clues - 1 ? "current" : ""}"></i>`).join("")}</div></div><div class="hud-attempts" aria-label="${remaining(state)} guesses remaining"><span class="attempt-dots">${Array.from({ length: 3 }, (_, i) => `<i class="${i >= remaining(state) ? "used" : ""}"></i>`).join("")}</span><span>${remaining(state)} <span class="hud-word">guesses left</span></span></div><div class="hud-score"><span class="hud-caption">${state.phase === "playing" ? "POTENTIAL" : "SCORE"}</span><strong>${format(state.phase === "playing" ? (remaining(state) ? potential(state) : 0) : state.score)}<span> pts</span></strong></div>`
    : "";
}

function render() {
  renderHUD();
  pin.hidden = view !== "discover";
  location.hidden = !["travel", "discover", "clue"].includes(view);
  footer.innerHTML = "";
  if (["travel", "discover", "clue"].includes(view)) {
    const stop = route[state.clues - 1];
    location.innerHTML = `<span class="eyebrow">${number(state.clues)} / GREENHILL</span><h2>${esc(stop.name)}</h2><span class="location-subtitle">${esc(view === "travel" ? stop.subtitle : stop.object)}</span>`;
    footer.innerHTML =
      view === "travel"
        ? `<div class="travel-status"><span class="walking-dots"><i></i><i></i><i></i></span><span>Following the story</span><div class="travel-progress"><i id="travel-fill"></i></div></div><button class="quiet-button arrival-button" data-action="arrive">Arrive now ${arrow}</button>`
        : `<button class="collected-button" data-action="history"><span>▤</span> Collected notes <b>${readCount}</b></button><span class="demo-caption">FICTIONAL MYSTERY / NO. ${mystery.number}</span>`;
  }
  if (view === "intro") {
    app.innerHTML = `<section class="intro-screen"><div class="intro-edition"><span class="sun-symbol">✳</span> A GREENHILL CAMPUS MYSTERY <i></i> NO. ${mystery.number}</div><h1 tabindex="-1">Seven clues.<br><em>One Greenhill senior.</em></h1><button class="primary-button start-button" data-action="start">Start today’s mystery ${arrow}</button><span class="intro-footnote">FOLLOW THE CLUES. FIND YOUR PERSON.</span></section><div class="intro-world-caption"><span class="small-compass">N <i>✧</i></span><span>BRINKMANN FIELD<br><b>GREENHILL, REIMAGINED</b></span></div>`;
  } else if (view === "travel") {
    app.innerHTML = `<div class="journey-indicator" aria-label="Traveling to ${esc(route[state.clues - 1].name)}"><span class="crosshair"></span></div>`;
  } else if (view === "discover") {
    app.innerHTML =
      '<div class="discover-hint"><span>✧</span> Something’s waiting for you.</div>';
  } else if (view === "clue") {
    app.innerHTML = clueOverlay();
    if (guessOpen && remaining(state))
      mountRoster(
        document.querySelector("#guess-form"),
        state.guesses,
        submitGuess,
      );
  } else if (view === "reveal") {
    app.innerHTML = `<section class="reveal-screen ${revealStage}"><button class="quiet-button skip-button" data-action="skip">Skip to spotlight ${arrow}</button><div class="reveal-copy"><span class="eyebrow">${state.solved ? "MYSTERY SOLVED" : "STORY DISCOVERED"}</span><h1 tabindex="-1">${revealStage === "identity" ? esc(mystery.name) : state.solved ? "You made the connection." : "Every story has a someone."}</h1><p>${revealStage === "identity" ? "The person behind the clues." : "Meet the person behind it all."}</p></div><div class="collected-orbit" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<span style="--i:${i}">${number(i + 1)}</span>`).join("")}</div></section>`;
  } else if (view === "spotlight") {
    app.innerHTML = spotlight();
  }
  bindActions();
}

function clueOverlay() {
  const clue = mystery.clues[state.clues - 1];
  const attempts = remaining(state);
  return `<section class="clue-overlay ${feedback ? "has-feedback" : ""}" aria-labelledby="clue-title"><div class="note-topline"><span class="eyebrow">CLUE ${number(state.clues)} <span>/ ${esc(clue.label)}</span></span><span class="note-seal" aria-hidden="true">✳</span></div><h2 id="clue-title" class="sr-only" tabindex="-1">Clue ${state.clues}</h2><p class="clue-text">“${esc(clue.text)}”</p>
    ${feedback ? `<div class="guess-feedback" role="status"><span>×</span><p>${esc(feedback)}</p></div>` : ""}
    ${guessOpen && attempts ? `<form id="guess-form" autocomplete="off"><label class="sr-only" for="senior-search">Search the fictional senior roster</label><div class="search-wrapper"><span class="search-symbol" aria-hidden="true">⌕</span><input id="senior-search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="roster-options" placeholder="Search a senior’s name…" autocapitalize="words" spellcheck="false"/><button type="button" class="clear-search" aria-label="Clear selected name" hidden>×</button><ul id="roster-options" class="roster-options" role="listbox" aria-label="Matching seniors" hidden></ul></div><button type="submit" class="submit-guess" disabled>Submit guess ${arrow}</button></form>` : ""}
    <div class="clue-actions">${attempts ? `<button class="guess-toggle" data-action="guess-toggle">${guessOpen ? "Back to the clue" : "Make a guess"} <span>${guessOpen ? "−" : "+"}</span></button>` : '<span class="no-guesses">No guesses left. Keep exploring.</span>'}${state.clues < 7 ? `<button class="primary-button continue-button" data-action="next">Continue ${arrow}</button>` : `<button class="primary-button continue-button" data-action="finish">${attempts ? "Reveal senior" : "Meet the senior"} ${arrow}</button>`}</div>${state.clues === 7 && attempts ? '<span class="finish-hint">Reveal without solving: 0 points</span>' : ""}</section>`;
}

function spotlight() {
  return `<section class="spotlight"><div class="spotlight-paper"><div class="spotlight-topline"><span class="eyebrow">HILLION / THE SENIOR SPOTLIGHT</span><span class="solved-stamp">${state.solved ? "MYSTERY SOLVED" : "STORY DISCOVERED"}</span></div><div class="spotlight-spread"><figure class="portrait-print"><img src="${mystery.portrait}" alt="Original illustrated portrait of fictional senior ${esc(mystery.name)}"/><figcaption>${esc(mystery.name)}<span>CLASS OF ${mystery.classYear}</span></figcaption></figure><div class="spotlight-story"><span class="eyebrow">THE PERSON BEHIND THE CLUES</span><h1 tabindex="-1">${esc(mystery.firstName)}<br><em>${esc(mystery.name.split(" ").slice(1).join(" "))}.</em><span>✳</span></h1><blockquote>“${esc(mystery.quote)}”</blockquote><div class="result-report"><div><strong>${format(state.score)}<small>/1,000</small></strong><span>POINTS</span></div><div><strong>${state.solved ? state.clues : "—"}<small>/7</small></strong><span>${state.solved ? "CLUES TO SOLVE" : "UNSOLVED"}</span></div><div><strong>${state.guesses.length}<small>/3</small></strong><span>GUESSES</span></div></div><button class="primary-button share-button" data-action="share">Share your result ${arrow}</button><p id="share-status" class="share-status" role="status">A little mystery. No spoilers.</p><div id="manual-share"></div></div></div><details class="spotlight-facts"><summary>Seven little things about ${esc(mystery.firstName)} <span>+</span></summary><ol>${mystery.clues.map((clue, i) => `<li><span>${number(i + 1)}</span><p>${esc(clue.text)}</p></li>`).join("")}</ol></details><div class="spotlight-bottom"><span>Same hallways. A whole new story.</span><button class="replay-button" data-action="reset">↻ Play again</button></div></div></section>`;
}

async function visit(index) {
  const token = ++sequence;
  guessOpen = false;
  feedback = "";
  setView("travel");
  announce(`Following the story to ${route[index].name}.`);
  const arrived = await world.moveTo(index);
  if (!arrived || token !== sequence) return;
  world.discover(index);
  setView("discover");
  pin.focus({ preventScroll: true });
  announce(
    `${route[index].name}. ${route[index].object}. Inspect the note to find clue ${index + 1}.`,
  );
}

function inspect() {
  if (view !== "discover") return;
  readCount = state.clues;
  world.inspect(state.clues - 1);
  setView("clue");
  focusHeading();
  announce(
    `Clue ${state.clues}. ${mystery.clues[state.clues - 1].text} ${remaining(state)} guesses left. ${remaining(state) ? potential(state) : 0} potential points.`,
  );
}

function submitGuess(id) {
  if (view !== "clue") return;
  const next = transition(state, { type: "GUESS", id });
  if (next === state) return;
  state = next;
  if (state.solved) {
    beginReveal();
    return;
  }
  feedback = `Not quite. ${remaining(state)} ${remaining(state) === 1 ? "guess" : "guesses"} left.`;
  if (!remaining(state)) guessOpen = false;
  render();
  announce(feedback);
}

async function beginReveal() {
  const token = ++sequence;
  clearTimeout(revealTimer);
  revealStage = "";
  setView("reveal");
  focusHeading();
  announce(
    state.solved
      ? `Mystery solved. ${state.score} points. Your senior spotlight is beginning.`
      : "The story is complete. Your senior spotlight is beginning.",
  );
  if (calm) {
    finishReveal();
    return;
  }
  const arrived = await world.toReveal();
  if (!arrived || token !== sequence) return;
  try {
    await world.openYearbook(mystery.portrait);
  } catch {
    /* The HTML spotlight still supplies its portrait and profile. */
  }
  if (token !== sequence) return;
  revealStage = "identity";
  render();
  announce(`Meet ${mystery.name}.`);
  revealTimer = setTimeout(() => {
    if (token === sequence) finishReveal();
  }, 2300);
}

function finishReveal() {
  ++sequence;
  clearTimeout(revealTimer);
  world.finishTravel();
  world.spotlight();
  state = transition(state, { type: "SPOTLIGHT" });
  setView("spotlight");
  focusHeading();
}

function reset() {
  ++sequence;
  clearTimeout(revealTimer);
  state = initialState();
  readCount = 0;
  guessOpen = false;
  feedback = "";
  help.close();
  history.close();
  world.reset();
  setView("intro");
  focusHeading();
}

function showHistory() {
  document.querySelector("#history-list").innerHTML =
    mystery.clues
      .slice(0, readCount)
      .map(
        (clue, i) =>
          `<li><span>${number(i + 1)} <small>${esc(route[i].name)}</small></span><p>${esc(clue.text)}</p></li>`,
      )
      .join("") || "<li><p>Your first note is waiting on campus.</p></li>";
  history.showModal();
}

function bindActions() {
  document.querySelectorAll("[data-action]").forEach(
    (button) =>
      (button.onclick = () => {
        const action = button.dataset.action;
        if (action === "start" && view === "intro") {
          state = transition(state, { type: "START" });
          visit(0);
        }
        if (action === "next" && view === "clue") {
          state = transition(state, { type: "NEXT" });
          visit(state.clues - 1);
        }
        if (action === "arrive") world.finishTravel();
        if (action === "guess-toggle") {
          guessOpen = !guessOpen;
          render();
          if (!guessOpen) document.querySelector(".guess-toggle")?.focus();
        }
        if (action === "finish" && view === "clue") {
          state = transition(state, { type: "FINISH" });
          beginReveal();
        }
        if (action === "skip") finishReveal();
        if (action === "history") showHistory();
        if (action === "reset") reset();
        if (action === "share") shareResults(state);
      }),
  );
}

function toggleMotion() {
  calm = !calm;
  world?.setCalm(calm);
  updateMotionButtons();
  announce(
    calm
      ? "Calm motion enabled. Camera journeys use a short transition."
      : "Guided camera movement enabled.",
  );
}
function updateMotionButtons() {
  const label = calm ? "Enable guided camera motion" : "Use calm camera motion";
  document.querySelector("#motion-button").setAttribute("aria-label", label);
  document
    .querySelector("#motion-button")
    .setAttribute("aria-pressed", String(calm));
  document.querySelector("#dialog-motion").textContent = calm
    ? "✓ Calm motion is on"
    : label;
}

pin.addEventListener("click", inspect);
document.querySelector("#home-button").addEventListener("click", () => {
  if (world) reset();
});
document.querySelector("#reset-button").addEventListener("click", () => {
  if (world) reset();
});
document
  .querySelector("#help-button")
  .addEventListener("click", () => help.showModal());
document
  .querySelector("#motion-button")
  .addEventListener("click", toggleMotion);
document
  .querySelector("#dialog-motion")
  .addEventListener("click", toggleMotion);
document
  .querySelector("#fullscreen-button")
  .addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      announce(
        "Fullscreen is unavailable in this browser. The game still fills your window.",
      );
    }
  });
document.addEventListener("fullscreenchange", () => {
  document
    .querySelector("#fullscreen-button")
    .setAttribute(
      "aria-label",
      document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
    );
});
for (const dialog of [help, history]) {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
}
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  (event) => {
    calm = event.matches;
    world?.setCalm(calm);
    updateMotionButtons();
  },
);

function showWorldError(error) {
  ++sequence;
  clearTimeout(revealTimer);
  document.body.dataset.view = "error";
  view = "error";
  hud.hidden = true;
  pin.hidden = true;
  location.hidden = true;
  footer.innerHTML = "";
  app.innerHTML = `<section class="world-error"><span class="eyebrow">CAMPUS CONNECTION</span><h1>The gates need<br>a little help.</h1><p>${esc(error.message.includes("interrupted") ? error.message : "Hillion needs WebGL2. Enable browser hardware acceleration, then reload.")}</p><button class="primary-button" onclick="window.location.reload()">Try again ${arrow}</button></section>`;
}

async function boot() {
  try {
    const { CampusWorld } = await import("./world.js");
    world = new CampusWorld(document.querySelector("#campus-world"), {
      onMarker: (point) => {
        if (view !== "discover") return;
        pin.style.left = `${Math.max(85, Math.min(innerWidth - 100, point.x))}px`;
        pin.style.top = `${Math.max(125, Math.min(innerHeight - 160, point.y))}px`;
        pin.hidden = !point.visible;
      },
      onProgress: (progress) => {
        const fill = document.querySelector("#travel-fill");
        if (fill) fill.style.transform = `scaleX(${progress})`;
      },
      onError: showWorldError,
    });
    if (new URLSearchParams(window.location.search).has("overhead"))
      window.__campus = world;
    world.setCalm(calm);
    updateMotionButtons();
    setView("intro");
  } catch (error) {
    console.error(error);
    showWorldError(error);
  }
}
boot();
