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

  writeFileSync(OUTPUT_PATH, JSON.stringify(puzzleData));
  console.log(`Wrote puzzle data to ${OUTPUT_PATH}`);

  const sizeKB = (JSON.stringify(puzzleData).length / 1024).toFixed(1);
  console.log(`Data size: ${sizeKB} KB`);
}

main();
