import { describe, it, expect } from 'vitest';
import { letterSignature, findExpansions, filterTrivialExpansions } from '../src/words.js';

const testDictionary = [
  'at', 'bat', 'cat', 'sat', 'tab', 'act',
  'cats', 'cast', 'scat', 'acts', 'coat', 'taco', 'cart',
  'rind', 'grind', 'diner', 'drink', 'rinds',
  'dog', 'doge', 'dogs', 'gods',
  // Multi-letter expansion test words
  'cleat', 'eclat',  // cat + e,l
  'steam', 'mates', 'meats', 'teams', 'tames',  // at + e,m,s
  'grinder',  // rind + e,g,r
  'risk', 'irks', 'kirs', 'kris',  // ski + r (regression test)
  'ski',
];

describe('letterSignature', () => {
  it('returns sorted lowercase letters', () => {
    expect(letterSignature('cat')).toBe('act');
    expect(letterSignature('taco')).toBe('acot');
    expect(letterSignature('CAT')).toBe('act');
  });
});

describe('findExpansions', () => {
  it('finds words formed by adding one letter to root', () => {
    const expansions = findExpansions('cat', testDictionary);
    // 'coat' = c,a,t + o (rearranged) -> valid
    // 'taco' = c,a,t + o (rearranged) -> valid
    // 'cart' = c,a,t + r (rearranged) -> valid
    // 'cast' = c,a,t + s -> but contains 'cat'? no, 'cast' does not contain 'cat'
    // 'scat' = c,a,t + s -> contains 'cat' -> trivial
    // 'cats' = c,a,t + s -> contains 'cat' -> trivial
    // 'acts' = c,a,t + s -> does not contain 'cat' -> valid
    expect(expansions).toHaveProperty('o');
    expect(expansions['o']).toContain('coat');
    expect(expansions['o']).toContain('taco');
    expect(expansions).toHaveProperty('r');
    expect(expansions['r']).toContain('cart');
  });

  it('includes words of length root+1 through root+maxExtra', () => {
    const expansions = findExpansions('cat', testDictionary);
    for (const key of Object.keys(expansions)) {
      for (const word of expansions[key]) {
        expect(word.length).toBe(3 + key.length); // cat is 3 letters, word should be root + key length
      }
    }
  });
});

describe('filterTrivialExpansions', () => {
  it('removes words that contain the root as substring', () => {
    const expansions = { s: ['cats', 'scat', 'cast', 'acts'] };
    const filtered = filterTrivialExpansions('cat', expansions);
    // 'cats' contains 'cat' -> removed
    // 'scat' contains 'cat' -> removed
    // 'cast' does NOT contain 'cat' -> kept
    // 'acts' does NOT contain 'cat' -> kept
    expect(filtered['s']).not.toContain('cats');
    expect(filtered['s']).not.toContain('scat');
    expect(filtered['s']).toContain('cast');
    expect(filtered['s']).toContain('acts');
  });

  it('removes letter keys that have no valid expansions left', () => {
    const expansions = { s: ['rinds'] };
    const filtered = filterTrivialExpansions('rind', expansions);
    expect(filtered).not.toHaveProperty('s');
  });

  it('keeps valid expansions untouched', () => {
    const expansions = { e: ['diner'], k: ['drink'] };
    const filtered = filterTrivialExpansions('rind', expansions);
    expect(filtered['e']).toContain('diner');
    expect(filtered['k']).toContain('drink');
  });

  it('filters words containing root as substring even in the middle', () => {
    // 'grind' contains 'rind' at position 1 -> trivial
    const expansions = { g: ['grind'] };
    const filtered = filterTrivialExpansions('rind', expansions);
    expect(filtered).not.toHaveProperty('g');
  });

  it('works with multi-letter expansion keys', () => {
    const expansions = { 'el': ['cleat', 'eclat'], 'eg': ['categ'] };
    const filtered = filterTrivialExpansions('cat', expansions);
    // Neither 'cleat' nor 'eclat' contain 'cat' as substring
    expect(filtered['el']).toContain('cleat');
    expect(filtered['el']).toContain('eclat');
  });
});

describe('findExpansions with multi-letter support', () => {
  it('finds +2 letter expansions', () => {
    const expansions = findExpansions('cat', testDictionary);
    // 'cleat' = cat + e,l (sorted: "el")
    expect(expansions).toHaveProperty('el');
    expect(expansions['el']).toContain('cleat');
    expect(expansions['el']).toContain('eclat');
  });

  it('finds +3 letter expansions', () => {
    const expansions = findExpansions('at', testDictionary);
    // 'steam' = at + e,m,s (sorted: "ems")
    expect(expansions).toHaveProperty('ems');
    expect(expansions['ems']).toContain('steam');
  });

  it('includes all valid words for ski+r without truncation', () => {
    const expansions = findExpansions('ski', testDictionary);
    expect(expansions).toHaveProperty('r');
    expect(expansions['r']).toContain('risk');
    expect(expansions['r']).toContain('irks');
    expect(expansions['r']).toContain('kirs');
    expect(expansions['r']).toContain('kris');
  });
});
