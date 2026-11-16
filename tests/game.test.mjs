import test from 'node:test';
import assert from 'node:assert/strict';
import { mystery, roster, basePoints } from '../src/data.js';
import { initialState, transition, remaining, potential, searchRoster, shareText } from '../src/game.js';

const start = () => transition(initialState(), { type: 'START' });
const wrongPeople = roster.filter(person => person.id !== mystery.studentId).slice(0, 3);
const guess = (state, id) => transition(state, { type: 'GUESS', id });

test('the curated case has seven text clues, a unique answer, and a realistic roster', () => {
  assert.equal(mystery.clues.length, 7);
  mystery.clues.forEach(clue => { assert.equal(typeof clue.text, 'string'); assert.ok(clue.text.length > 10); assert.ok(!clue.text.includes(mystery.name)); });
  assert.ok(roster.length === 100);
  assert.equal(new Set(roster.map(person => person.id)).size, roster.length);
  assert.equal(roster.filter(person => person.id === mystery.studentId).length, 1);
});

test('clues unlock freely, retain their count, and stop at seven', () => {
  let state = start();
  assert.equal(state.clues, 1);
  assert.equal(remaining(state), 3);
  for (let clue = 2; clue <= 7; clue++) {
    state = transition(state, { type: 'NEXT' });
    assert.equal(state.clues, clue);
    assert.equal(remaining(state), 3);
    assert.equal(potential(state), basePoints[clue - 1]);
  }
  assert.equal(transition(state, { type: 'NEXT' }), state);
});

for (let clue = 1; clue <= 7; clue++) {
  for (let wrong = 0; wrong <= 2; wrong++) {
    test(`solve on clue ${clue} with ${wrong} incorrect guesses uses the exact score rule`, () => {
      let state = start();
      for (let i = 1; i < clue; i++) state = transition(state, { type: 'NEXT' });
      for (let i = 0; i < wrong; i++) state = guess(state, wrongPeople[i].id);
      assert.equal(potential(state), Math.max(0, basePoints[clue - 1] - wrong * 100));
      state = guess(state, mystery.studentId);
      assert.equal(state.phase, 'reveal');
      assert.equal(state.solved, true);
      assert.equal(state.score, Math.max(0, basePoints[clue - 1] - wrong * 100));
      assert.equal(state.guesses.length, wrong + 1);
      assert.equal(guess(state, wrongPeople[2].id), state);
      assert.equal(transition(state, { type: 'NEXT' }), state);
    });
  }
}

test('empty, invalid, duplicate, and post-round guesses never consume attempts', () => {
  let state = start();
  for (const id of ['', 'unknown', null, undefined]) assert.equal(guess(state, id), state);
  state = guess(state, wrongPeople[0].id);
  assert.equal(remaining(state), 2);
  assert.equal(guess(state, wrongPeople[0].id), state);
  assert.equal(potential(state), 900);
  assert.equal(guess(initialState(), mystery.studentId).phase, 'intro');
});

test('all three wrong guesses block guessing while every remaining clue stays available', () => {
  let state = start();
  for (const person of wrongPeople) state = guess(state, person.id);
  assert.equal(remaining(state), 0);
  assert.equal(state.phase, 'playing');
  assert.equal(guess(state, mystery.studentId), state);
  assert.equal(transition(state, { type: 'FINISH' }), state);
  for (let i = 1; i < 7; i++) state = transition(state, { type: 'NEXT' });
  assert.equal(state.clues, 7);
  state = transition(state, { type: 'FINISH' });
  assert.equal(state.solved, false);
  assert.equal(state.score, 0);
  state = transition(state, { type: 'SPOTLIGHT' });
  assert.equal(state.phase, 'spotlight');
  assert.deepEqual(transition(state, { type: 'RESET' }), initialState());
});

test('choosing the final reveal with unused guesses ends the case for zero points', () => {
  let state = start();
  for (let i = 1; i < 7; i++) state = transition(state, { type: 'NEXT' });
  state = transition(state, { type: 'FINISH' });
  assert.equal(state.score, 0);
  assert.equal(state.phase, 'reveal');
  assert.equal(guess(state, mystery.studentId), state);
});

test('roster search is case insensitive, supports name parts and apostrophes, and marks duplicates', () => {
  assert.deepEqual(searchRoster('  nIsEeM  bHaTtAcHaRyA  ').map(person => person.id), ['niseem-bhattacharya']);
  assert.ok(searchRoster('bhattacharya').length > 1);
  assert.equal(searchRoster("dube")[0].name, 'Malia Dubé');
  assert.equal(searchRoster('not in the roster').length, 0);
  assert.equal(searchRoster(' ').length, 0);
  assert.equal(searchRoster('niseem', [{ id: 'niseem-bhattacharya' }])[0].guessed, true);
});

test('shared results never expose the senior, facts, or guess names in either ending', () => {
  for (const solved of [true, false]) {
    let state = start();
    state = solved ? guess(state, mystery.studentId) : { ...state, clues: 7, score: 0 };
    const text = shareText(state);
    assert.ok(text.includes('HILLION #001'));
    assert.ok(!text.includes(mystery.name));
    mystery.clues.forEach(clue => assert.ok(!text.includes(clue.text)));
    wrongPeople.forEach(person => assert.ok(!text.includes(person.name)));
  }
});
