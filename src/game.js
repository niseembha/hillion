import { basePoints, mystery, roster } from './data.js';

export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').trim().toLowerCase();
export const initialState = () => ({ phase: 'intro', clues: 0, guesses: [], solved: false, score: 0 });
export const remaining = state => 3 - state.guesses.length;
export const wrongCount = state => state.guesses.filter(guess => !guess.correct).length;
export const potential = state => Math.max(0, (basePoints[state.clues - 1] ?? 0) - wrongCount(state) * 100);
export function searchRoster(query, guesses = []) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return roster.filter(person => words.every(word => normalize(person.name).includes(word)))
    .map(person => ({ ...person, guessed: guesses.some(guess => guess.id === person.id) }));
}

// Pure transitions keep all score and attempt rules in one small, testable place.
export function transition(state, action) {
  switch (action.type) {
    case 'START': return state.phase === 'intro' ? { ...state, phase: 'playing', clues: 1 } : state;
    case 'NEXT': return state.phase === 'playing' && state.clues < 7 ? { ...state, clues: state.clues + 1 } : state;
    case 'GUESS': {
      const person = roster.find(item => item.id === action.id);
      if (state.phase !== 'playing' || !person || !remaining(state) || state.guesses.some(guess => guess.id === person.id)) return state;
      const correct = person.id === mystery.studentId;
      return { ...state, guesses: [...state.guesses, { ...person, correct, clue: state.clues }], solved: correct,
        score: correct ? potential(state) : 0, phase: correct ? 'reveal' : 'playing' };
    }
    case 'FINISH': return state.phase === 'playing' && state.clues === 7 ? { ...state, phase: 'reveal', score: 0 } : state;
    case 'SPOTLIGHT': return state.phase === 'reveal' ? { ...state, phase: 'spotlight' } : state;
    case 'RESET': return initialState();
    default: return state;
  }
}

export function shareText(state) {
  const progress = Array.from({ length: 7 }, (_, index) => index < state.clues ? (state.solved && index === state.clues - 1 ? '🟨' : '🟩') : '⬜').join('');
  return `HILLION #${mystery.number}\n${progress}\n${state.solved ? `Solved in ${state.clues} clue${state.clues === 1 ? '' : 's'}` : 'A new story discovered'}\n${state.score.toLocaleString('en-US')}/1,000 points · ${state.guesses.length}/3 guesses\nSeven clues. One Greenhill senior.\nCan you crack the case?`;
}
