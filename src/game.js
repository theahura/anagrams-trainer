import { getDailyRng, seededShuffle, seededPick } from './prng.js';

export function isTrivialExtension(root, answer) {
  return answer.toLowerCase().includes(root.toLowerCase());
}

export function isValidAnswer(answer, round) {
  const answerLower = answer.toLowerCase();
  if (isTrivialExtension(round.root, answerLower)) return false;

  const lettersToCheck = round.offeredLetters || Object.keys(round.expansions);
  for (const letter of lettersToCheck) {
    const words = round.expansions[letter];
    if (words && words.some(w => w.toLowerCase() === answerLower)) return true;
  }
  return false;
}

export function getAnswersForRound(round) {
  const results = [];
  for (const letter of round.offeredLetters) {
    const words = round.expansions[letter];
    if (words) {
      for (const w of words) {
        if (!isTrivialExtension(round.root, w)) results.push(w);
      }
    }
  }
  return results;
}

export function selectDailyPuzzle(puzzleData, dateStr) {
  const rng = getDailyRng(dateStr);
  const rounds = [];

  const pick = (pool, count) => {
    const shuffled = seededShuffle([...pool], rng);
    // If pool is smaller than count, cycle through it
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result;
  };

  rounds.push(...pick(puzzleData[3], 3));
  rounds.push(...pick(puzzleData[4], 3));
  rounds.push(...pick(puzzleData[5], 3));
  rounds.push(...pick(puzzleData[6], 1));

  // 7+ letter words: combine all pools of length 7+
  const sevenPlus = [];
  for (const [len, entries] of Object.entries(puzzleData)) {
    if (Number(len) >= 7) sevenPlus.push(...entries);
  }
  rounds.push(...pick(sevenPlus, 1));

  return rounds.map(entry => ({
    ...entry,
    offeredLetters: getOfferedLetters(entry, rng),
  }));
}

export function getOfferedLetters(puzzleEntry, rng) {
  const validLetters = Object.keys(puzzleEntry.expansions);
  const letters = new Set();

  // Always include at least one valid letter
  letters.add(seededPick(validLetters, rng));

  // Build pool of remaining candidates: other valid letters + alphabet
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const pool = [...new Set([...validLetters, ...alphabet])];
  const shuffled = seededShuffle([...pool], rng);

  for (const candidate of shuffled) {
    if (letters.size >= 3) break;
    if (!letters.has(candidate)) {
      letters.add(candidate);
    }
  }

  return seededShuffle([...letters], rng);
}

export function calculateScore(completedRounds) {
  return {
    totalLetters: completedRounds.reduce((sum, r) => sum + r.answer.length, 0),
    totalTimeMs: completedRounds.reduce((sum, r) => sum + r.timeMs, 0),
    roundsCompleted: completedRounds.length,
  };
}
