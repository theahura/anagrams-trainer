import { writeFileSync } from 'fs';
import { buildSignatureIndex, findExpansions, filterTrivialExpansions } from '../src/words.js';

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
    console.log(`Processing ${rootLen}-letter roots...`);
    const roots = dictionary.filter(w => w.length === rootLen);
    const validRoots = [];

    for (const root of roots) {
      const allExpansions = findExpansions(root, index);
      const filtered = filterTrivialExpansions(root, allExpansions);
      const validLetterCount = Object.keys(filtered).length;

      if (validLetterCount >= MIN_EXPANSIONS) {
        validRoots.push({ root, expansions: filtered });
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
      // Keep roots with the most expansion variety (most valid letters)
      puzzleData[len].sort((a, b) =>
        Object.keys(b.expansions).length - Object.keys(a.expansions).length
      );
      puzzleData[len] = puzzleData[len].slice(0, MAX_ROOTS_PER_LENGTH);
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(puzzleData));
  console.log(`Wrote puzzle data to ${OUTPUT_PATH}`);

  const sizeKB = (JSON.stringify(puzzleData).length / 1024).toFixed(1);
  console.log(`Data size: ${sizeKB} KB`);
}

main();
