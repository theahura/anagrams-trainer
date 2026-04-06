import { letterSignature } from '../games/reword/src/words.js';

export function parseWordsFromHtml(html) {
  const regex = /<a href="\/dictionary\/([^"]+)">/g;
  const seen = new Set();
  const words = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const word = match[1].toLowerCase();
    if (!seen.has(word)) {
      seen.add(word);
      words.push(word);
    }
  }
  return words;
}

export function deriveExpansionKey(root, answer) {
  if (answer.length <= root.length) return null;

  const rootSig = letterSignature(root).split('');
  const answerSig = letterSignature(answer).split('');

  const extra = [];
  const remaining = [...rootSig];

  for (const ch of answerSig) {
    const idx = remaining.indexOf(ch);
    if (idx !== -1) {
      remaining.splice(idx, 1);
    } else {
      extra.push(ch);
    }
  }

  // If not all root letters were consumed, this isn't a valid expansion
  if (remaining.length > 0) return null;

  return extra.length > 0 ? extra.sort().join('') : null;
}

export function groupByExpansionKey(root, words) {
  const groups = {};
  for (const word of words) {
    const key = deriveExpansionKey(root, word);
    if (key === null) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(word);
  }
  return groups;
}

const WEB_BASE_URL = 'https://wordunscrambler.me/unscramble/';

export async function fetchWordsFromWeb(query) {
  const url = `${WEB_BASE_URL}${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const html = await response.text();
  return parseWordsFromHtml(html);
}

export async function fetchExpansionsFromWeb(root, maxWildcards = 2) {
  const allWords = [];
  for (let i = 1; i <= maxWildcards; i++) {
    const query = root + '*'.repeat(i);
    const words = await fetchWordsFromWeb(query);
    allWords.push(...words);
  }
  const unique = [...new Set(allWords)];
  return groupByExpansionKey(root, unique);
}
