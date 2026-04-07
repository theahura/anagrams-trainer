import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fetchExpansionsFromWeb, fetchWordsFromWeb, groupByExpansionKey } from './web-scraper.js';
import { trimPuzzleData } from './build-words.js';

const OUTPUT_PATH = new URL('../games/reword/data/puzzles.json', import.meta.url).pathname;
const CACHE_PATH = new URL('../games/reword/data/web-cache.json', import.meta.url).pathname;
const MIN_EXPANSIONS = 3;
const DELAY_MS = 500;
const MAX_ROOTS_PER_LENGTH = 500;

// TWL06 fallback for +3 letter expansions (website max 2 wildcards)
const WORD_LIST_URL = 'https://raw.githubusercontent.com/cviebrock/wordlists/master/TWL06.txt';

function loadCache() {
  if (existsSync(CACHE_PATH)) {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
  }
  return {};
}

function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadWordList() {
  console.log('Downloading TWL06 word list (for candidate roots & +3 fallback)...');
  const response = await fetch(WORD_LIST_URL);
  const text = await response.text();
  return text.trim().split('\n').map(w => w.trim().toLowerCase());
}

async function fetchExpansionsCached(root, cache) {
  const cacheKey = root;
  if (cache[cacheKey]) return cache[cacheKey];

  const expansions = await fetchExpansionsFromWeb(root, 2);
  cache[cacheKey] = expansions;
  return expansions;
}

async function main() {
  const dictionary = await downloadWordList();
  const cache = loadCache();
  const puzzleData = {};

  for (const rootLen of [3, 4, 5, 6, 7, 8]) {
    console.log(`Processing ${rootLen}-letter roots...`);
    const candidateRoots = dictionary.filter(w => w.length === rootLen);
    const validRoots = [];
    let fetched = 0;

    for (const root of candidateRoots) {
      const wasCached = !!cache[root];
      const webExpansions = await fetchExpansionsCached(root, cache);

      if (!wasCached) {
        fetched++;
        // Save cache periodically
        if (fetched % 50 === 0) {
          saveCache(cache);
          console.log(`  Cached ${fetched} new fetches, ${validRoots.length} valid roots so far...`);
        }
        await delay(DELAY_MS);
      }

      const validKeyCount = Object.keys(webExpansions).length;

      if (validKeyCount >= MIN_EXPANSIONS) {
        validRoots.push({ root, expansions: webExpansions });
      }

      // Stop once we have enough roots
      if (validRoots.length >= MAX_ROOTS_PER_LENGTH) break;
    }

    console.log(`  Found ${validRoots.length} roots with ${MIN_EXPANSIONS}+ valid expansions (${fetched} web fetches)`);
    puzzleData[rootLen] = validRoots;
  }

  // Save final cache
  saveCache(cache);

  const trimmed = trimPuzzleData(puzzleData);

  writeFileSync(OUTPUT_PATH, JSON.stringify(trimmed));
  console.log(`Wrote puzzle data to ${OUTPUT_PATH}`);

  const sizeKB = (JSON.stringify(trimmed).length / 1024).toFixed(1);
  console.log(`Data size: ${sizeKB} KB`);
}

main();
