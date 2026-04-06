import { describe, it, expect } from 'vitest';
import { parseWordsFromHtml, deriveExpansionKey, groupByExpansionKey } from '../scripts/web-scraper.js';

describe('parseWordsFromHtml', () => {
  it('extracts words from dictionary links', () => {
    const html = `
      <h3>5 Letter Words</h3>
      <ul>
        <li><a href="/dictionary/dinar">dinar</a></li>
        <li><a href="/dictionary/diner">diner</a></li>
        <li><a href="/dictionary/drain">drain</a></li>
        <li><a href="/dictionary/grind">grind</a></li>
      </ul>
      <h3>4 Letter Words</h3>
      <ul>
        <li><a href="/dictionary/rind">rind</a></li>
        <li><a href="/dictionary/nird">nird</a></li>
      </ul>
    `;
    const words = parseWordsFromHtml(html);
    expect(words).toEqual(['dinar', 'diner', 'drain', 'grind', 'rind', 'nird']);
  });

  it('returns empty array for HTML with no dictionary links', () => {
    const html = '<h1>No results found</h1>';
    expect(parseWordsFromHtml(html)).toEqual([]);
  });

  it('handles duplicate words by deduplicating', () => {
    const html = `
      <a href="/dictionary/grind">grind</a>
      <a href="/dictionary/grind">grind</a>
    `;
    expect(parseWordsFromHtml(html)).toEqual(['grind']);
  });

  it('lowercases all extracted words', () => {
    const html = '<a href="/dictionary/GRIND">GRIND</a>';
    expect(parseWordsFromHtml(html)).toEqual(['grind']);
  });
});

describe('deriveExpansionKey', () => {
  it('returns added letter for single-letter expansion', () => {
    // "rind" (d,i,n,r) + "g" = "grind" (d,g,i,n,r)
    expect(deriveExpansionKey('rind', 'grind')).toBe('g');
  });

  it('returns added letter for another single-letter expansion', () => {
    // "rind" (d,i,n,r) + "e" = "diner" (d,e,i,n,r)
    expect(deriveExpansionKey('rind', 'diner')).toBe('e');
  });

  it('returns sorted multi-letter key for two-letter expansion', () => {
    // "ski" (i,k,s) + "er" = "skier" (e,i,k,r,s)
    expect(deriveExpansionKey('ski', 'skier')).toBe('er');
  });

  it('returns sorted multi-letter key for three-letter expansion', () => {
    // "rind" (d,i,n,r) + "egr" = "grinder" (d,e,g,i,n,r,r)
    expect(deriveExpansionKey('rind', 'grinder')).toBe('egr');
  });

  it('returns null when answer has fewer or equal letters to root', () => {
    expect(deriveExpansionKey('rind', 'din')).toBeNull();
    expect(deriveExpansionKey('rind', 'rind')).toBeNull();
  });

  it('returns sorted key for two-letter expansion with different root', () => {
    // "ore" (e,o,r) + "gr" = "roger" (e,g,o,r,r)
    expect(deriveExpansionKey('ore', 'roger')).toBe('gr');
  });

  it('returns null when answer does not contain all root letters', () => {
    // "rind" (d,i,n,r) vs "grape" (a,e,g,p,r) — root letters not all present
    expect(deriveExpansionKey('rind', 'grape')).toBeNull();
  });
});

describe('groupByExpansionKey', () => {
  it('groups answer words by their expansion key', () => {
    const result = groupByExpansionKey('rind', ['grind', 'diner', 'drain']);
    expect(result).toEqual({
      'g': ['grind'],
      'e': ['diner'],
      'a': ['drain'],
    });
  });

  it('groups multiple words under the same key', () => {
    const result = groupByExpansionKey('ski', ['irks', 'kirs', 'kris', 'risk']);
    expect(result).toEqual({
      'r': ['irks', 'kirs', 'kris', 'risk'],
    });
  });

  it('skips words that are same length or shorter than root', () => {
    const result = groupByExpansionKey('rind', ['grind', 'din', 'rind']);
    expect(result).toEqual({
      'g': ['grind'],
    });
  });

  it('handles empty word list', () => {
    expect(groupByExpansionKey('rind', [])).toEqual({});
  });

  it('handles multi-letter expansion keys', () => {
    // "ski" + "er" = "skier"(e,i,k,r,s)
    const result = groupByExpansionKey('ski', ['skier']);
    expect(result).toEqual({
      'er': ['skier'],
    });
  });
});
