export function letterSignature(word) {
  return word.toLowerCase().split('').sort().join('');
}

// Build a map from signature -> [words] for fast lookup
export function buildSignatureIndex(dictionary) {
  const index = new Map();
  for (const word of dictionary) {
    const sig = letterSignature(word);
    if (!index.has(sig)) index.set(sig, []);
    index.get(sig).push(word.toLowerCase());
  }
  return index;
}

export function findExpansions(root, dictionaryOrIndex) {
  // Accept either an array (original API) or a pre-built index
  const index = dictionaryOrIndex instanceof Map
    ? dictionaryOrIndex
    : buildSignatureIndex(dictionaryOrIndex);

  const rootLower = root.toLowerCase();
  const rootSig = letterSignature(rootLower);
  const expansions = {};

  for (let c = 97; c <= 122; c++) { // a-z
    const extraLetter = String.fromCharCode(c);
    const targetSig = insertSorted(rootSig, extraLetter);
    const matches = index.get(targetSig);
    if (matches) {
      expansions[extraLetter] = [...matches];
    }
  }

  return expansions;
}

function insertSorted(sortedStr, char) {
  for (let i = 0; i < sortedStr.length; i++) {
    if (char <= sortedStr[i]) {
      return sortedStr.slice(0, i) + char + sortedStr.slice(i);
    }
  }
  return sortedStr + char;
}

export function filterTrivialExpansions(root, expansions) {
  const rootLower = root.toLowerCase();
  const filtered = {};

  for (const [letter, words] of Object.entries(expansions)) {
    const validWords = words.filter(w => !w.toLowerCase().includes(rootLower));
    if (validWords.length > 0) {
      filtered[letter] = validWords;
    }
  }

  return filtered;
}
