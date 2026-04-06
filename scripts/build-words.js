import { writeFileSync } from 'fs';
import { buildSignatureIndex, findExpansions } from '../src/words.js';

const WORD_LIST_URL = 'https://raw.githubusercontent.com/cviebrock/wordlists/master/TWL06.txt';
const OUTPUT_PATH = new URL('../data/puzzles.json', import.meta.url).pathname;
const MIN_EXPANSIONS = 3;

async function downloadWordList() {
  console.log('Downloading TWL06 word list...');
  const response = await fetch(WORD_LIST_URL);
  const text = await response.text();
  const words = text.trim().split('\n').map(w => w.trim().toLowerCase());
  console.log(`Downloaded ${words.length} words`);
  return words;
}

function buildPuzzleData(dictionary) {
  console.log('Building signature index...');
  const index = buildSignatureIndex(dictionary);
  console.log(`Index has ${index.size} signatures`);

  const puzzleData = {};

  for (const rootLen of [3, 4, 5, 6, 7, 8]) {
    // Limit extra letters: +3 for short roots, +2 for medium, +1 for long
    const maxExtra = rootLen <= 5 ? 3 : rootLen <= 6 ? 2 : 1;
    console.log(`Processing ${rootLen}-letter roots (max +${maxExtra} letters)...`);
    const roots = dictionary.filter(w => w.length === rootLen);
    const validRoots = [];

    for (const root of roots) {
      const expansions = findExpansions(root, index, maxExtra);
      const validLetterCount = Object.keys(expansions).length;

      if (validLetterCount >= MIN_EXPANSIONS) {
        validRoots.push({ root, expansions });
      }
    }

    console.log(`  Found ${validRoots.length} roots with ${MIN_EXPANSIONS}+ valid expansions`);
    puzzleData[rootLen] = validRoots;
  }

  return puzzleData;
}

async function main() {
  const dictionary = await downloadWordList();
  const puzzleData = buildPuzzleData(dictionary);

  for (const [len, roots] of Object.entries(puzzleData)) {
    console.log(`${len}-letter roots: ${roots.length}`);
  }

  // Trim to max 500 roots per length to keep file size manageable
  // 500 roots per level = enough for years of daily play
  const MAX_ROOTS_PER_LENGTH = 500;
  for (const len of Object.keys(puzzleData)) {
    if (puzzleData[len].length > MAX_ROOTS_PER_LENGTH) {
      // Keep roots with the most single-letter expansion variety (core gameplay)
      puzzleData[len].sort((a, b) => {
        const aSingle = Object.keys(a.expansions).filter(k => k.length === 1).length;
        const bSingle = Object.keys(b.expansions).filter(k => k.length === 1).length;
        return bSingle - aSingle || Object.keys(b.expansions).length - Object.keys(a.expansions).length;
      });
      puzzleData[len] = puzzleData[len].slice(0, MAX_ROOTS_PER_LENGTH);
    }
  }

  // Trim expansion data to control file size
  const MAX_KEYS_PER_ROOT = 30;
  const MAX_WORDS_PER_KEY = 5;
  for (const roots of Object.values(puzzleData)) {
    for (const entry of roots) {
      // Cap words per key
      for (const key of Object.keys(entry.expansions)) {
        if (entry.expansions[key].length > MAX_WORDS_PER_KEY) {
          entry.expansions[key] = entry.expansions[key].slice(0, MAX_WORDS_PER_KEY);
        }
      }
      // Cap total keys per root: prioritize single-letter keys, then shorter multi-letter keys
      const keys = Object.keys(entry.expansions);
      if (keys.length > MAX_KEYS_PER_ROOT) {
        keys.sort((a, b) => a.length - b.length || a.localeCompare(b));
        const keepKeys = new Set(keys.slice(0, MAX_KEYS_PER_ROOT));
        for (const key of keys) {
          if (!keepKeys.has(key)) delete entry.expansions[key];
        }
      }
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(puzzleData));
  console.log(`Wrote puzzle data to ${OUTPUT_PATH}`);

  const sizeKB = (JSON.stringify(puzzleData).length / 1024).toFixed(1);
  console.log(`Data size: ${sizeKB} KB`);
}

main();
