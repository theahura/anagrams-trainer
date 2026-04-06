import { describe, it, expect } from 'vitest';
import { letterSignature, findExpansions } from '../games/reword/src/words.js';

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
    expect(expansions).toHaveProperty('o');
    expect(expansions['o']).toContain('coat');
    expect(expansions['o']).toContain('taco');
    expect(expansions).toHaveProperty('r');
    expect(expansions['r']).toContain('cart');
    expect(expansions).toHaveProperty('s');
    expect(expansions['s']).toContain('cats');
    expect(expansions['s']).toContain('cast');
    expect(expansions['s']).toContain('scat');
    expect(expansions['s']).toContain('acts');
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
