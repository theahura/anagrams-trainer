import { describe, it, expect } from 'vitest';
import {
  isTrivialExtension,
  isValidAnswer,
  selectDailyPuzzle,
  getOfferedLetters,
  calculateScore,
} from '../src/game.js';

// Minimal puzzle data for testing
const testPuzzleData = {
  3: [
    { root: 'cat', expansions: { o: ['coat', 'taco'], r: ['cart'], s: ['cast', 'acts'] } },
    { root: 'dog', expansions: { s: ['gods'], n: ['dong'] } },
    { root: 'pen', expansions: { i: ['pine'], a: ['nape', 'pane'] } },
    { root: 'bat', expansions: { e: ['beat', 'beta'], s: ['stab', 'tabs'] } },
  ],
  4: [
    { root: 'rind', expansions: { e: ['diner'], k: ['drink'], a: ['nadir', 'drain'] } },
    { root: 'lamp', expansions: { c: ['clamp'], s: ['psalm'] } },
    { root: 'tone', expansions: { s: ['stone', 'notes', 'onset'], r: ['tenor', 'noter'] } },
    { root: 'mare', expansions: { d: ['dream'], s: ['smear'] } },
  ],
  5: [
    { root: 'bread', expansions: { k: ['barked'], e: ['beader'] } },
    { root: 'flame', expansions: { r: ['flamre'], i: ['flamie'] } },
    { root: 'plant', expansions: { e: ['planet', 'platen'] } },
    { root: 'heart', expansions: { d: ['thread', 'dearth', 'hatred'], w: ['wreath', 'thawer'] } },
  ],
  6: [
    { root: 'garden', expansions: { e: ['angered', 'enraged'], i: ['reading', 'gradine'] } },
    { root: 'listen', expansions: { g: ['singlet', 'tingler'], r: ['linters', 'slinter'] } },
  ],
  7: [
    { root: 'strange', expansions: { r: ['granters'], i: ['astringe'] } },
    { root: 'pointed', expansions: { s: ['deposits', 'topsides'] } },
  ],
};

describe('isTrivialExtension', () => {
  it('returns true when answer contains root as substring', () => {
    expect(isTrivialExtension('rind', 'rinds')).toBe(true);
    expect(isTrivialExtension('cat', 'cats')).toBe(true);
    expect(isTrivialExtension('cat', 'scat')).toBe(true);
  });

  it('returns true when root appears in middle of answer', () => {
    expect(isTrivialExtension('rind', 'grind')).toBe(true);
  });

  it('returns false when answer does not contain root as substring', () => {
    expect(isTrivialExtension('rind', 'diner')).toBe(false);
    expect(isTrivialExtension('rind', 'drink')).toBe(false);
    expect(isTrivialExtension('cat', 'taco')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isTrivialExtension('Cat', 'CATS')).toBe(true);
    expect(isTrivialExtension('CAT', 'taco')).toBe(false);
  });
});

describe('selectDailyPuzzle', () => {
  it('returns exactly 11 rounds', () => {
    const puzzle = selectDailyPuzzle(testPuzzleData, '2026-04-05');
    expect(puzzle).toHaveLength(11);
  });

  it('has correct difficulty progression', () => {
    const puzzle = selectDailyPuzzle(testPuzzleData, '2026-04-05');
    // First 3 roots should be 3 letters
    for (let i = 0; i < 3; i++) {
      expect(puzzle[i].root.length).toBe(3);
    }
    // Next 3 roots should be 4 letters
    for (let i = 3; i < 6; i++) {
      expect(puzzle[i].root.length).toBe(4);
    }
    // Next 3 roots should be 5 letters
    for (let i = 6; i < 9; i++) {
      expect(puzzle[i].root.length).toBe(5);
    }
    // 10th root should be 6 letters
    expect(puzzle[9].root.length).toBe(6);
    // 11th root should be 7+ letters
    expect(puzzle[10].root.length).toBeGreaterThanOrEqual(7);
  });

  it('returns the same puzzle for the same date', () => {
    const puzzle1 = selectDailyPuzzle(testPuzzleData, '2026-04-05');
    const puzzle2 = selectDailyPuzzle(testPuzzleData, '2026-04-05');
    expect(puzzle1).toEqual(puzzle2);
  });

  it('returns different puzzles for different dates', () => {
    const puzzle1 = selectDailyPuzzle(testPuzzleData, '2026-04-05');
    const puzzle2 = selectDailyPuzzle(testPuzzleData, '2026-04-06');
    const roots1 = puzzle1.map(p => p.root);
    const roots2 = puzzle2.map(p => p.root);
    // They might occasionally match on some roots, but the full set should differ
    // (With our small test data, they'll likely share some, but the offered letters should differ)
    expect(puzzle1).not.toEqual(puzzle2);
  });
});

describe('isValidAnswer', () => {
  it('accepts a valid non-trivial answer', () => {
    const round = { root: 'rind', expansions: { e: ['diner'], k: ['drink'] }, offeredLetters: ['e', 'k', 'z'] };
    expect(isValidAnswer('diner', round)).toBe(true);
    expect(isValidAnswer('drink', round)).toBe(true);
  });

  it('rejects a word not in expansions', () => {
    const round = { root: 'rind', expansions: { e: ['diner'], k: ['drink'] }, offeredLetters: ['e', 'k', 'z'] };
    expect(isValidAnswer('pizza', round)).toBe(false);
  });

  it('rejects a trivial extension even if technically valid letters', () => {
    // 'rinds' uses root 'rind' + 's', but contains 'rind' as substring
    const round = { root: 'rind', expansions: { s: ['rinds'] }, offeredLetters: ['s', 'g', 'e'] };
    expect(isValidAnswer('rinds', round)).toBe(false);
  });

  it('is case-insensitive', () => {
    const round = { root: 'rind', expansions: { e: ['diner'] }, offeredLetters: ['e', 'k', 'z'] };
    expect(isValidAnswer('DINER', round)).toBe(true);
    expect(isValidAnswer('Diner', round)).toBe(true);
  });
});

describe('getOfferedLetters', () => {
  it('returns exactly 3 letters', () => {
    const puzzleEntry = { root: 'rind', expansions: { e: ['diner'], k: ['drink'], a: ['nadir'] } };
    const letters = getOfferedLetters(puzzleEntry, () => 0.5);
    expect(letters).toHaveLength(3);
  });

  it('includes at least one letter that leads to a valid non-trivial answer', () => {
    const puzzleEntry = { root: 'cat', expansions: { o: ['coat', 'taco'], r: ['cart'] } };
    const letters = getOfferedLetters(puzzleEntry, () => 0.5);
    // At least one of the offered letters should be a key in expansions
    // that has a non-trivial answer
    const validLetters = Object.keys(puzzleEntry.expansions);
    const hasValid = letters.some(l => validLetters.includes(l));
    expect(hasValid).toBe(true);
  });
});

describe('calculateScore', () => {
  it('sums total letters across all completed words', () => {
    const completedRounds = [
      { answer: 'grind', timeMs: 5000 },
      { answer: 'diner', timeMs: 3000 },
      { answer: 'coat', timeMs: 2000 },
    ];
    const score = calculateScore(completedRounds);
    expect(score.totalLetters).toBe(5 + 5 + 4);
  });

  it('tracks total elapsed time', () => {
    const completedRounds = [
      { answer: 'grind', timeMs: 5000 },
      { answer: 'diner', timeMs: 3000 },
    ];
    const score = calculateScore(completedRounds);
    expect(score.totalTimeMs).toBe(8000);
  });

  it('counts completed rounds', () => {
    const completedRounds = [
      { answer: 'grind', timeMs: 5000 },
      { answer: 'diner', timeMs: 3000 },
    ];
    const score = calculateScore(completedRounds);
    expect(score.roundsCompleted).toBe(2);
  });
});
