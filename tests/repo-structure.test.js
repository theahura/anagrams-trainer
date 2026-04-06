import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('repo structure', () => {
  it('renames the root package to games', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.name).toBe('games');
  });

  it('turns the root page into a games index that links to reword', () => {
    const html = read('index.html');
    expect(html).toContain('Games');
    expect(html).toContain('Reword');
    expect(html).toContain('href="./reword/"');
  });

  it('keeps the reword source under games/reword and exposes a reword entry page', () => {
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/src/main.js'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/src/components/App.vue'))).toBe(true);

    const html = read('reword/index.html');
    expect(html).toContain('../games/reword/style.css');
    expect(html).toContain('../games/reword/src/main.js');
  });

  it('keeps reword-specific docs, specs, and data under games/reword', () => {
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/APPLICATION-SPEC.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/docs.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/data/docs.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/data/puzzles.json'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/spec/APPLICATION-SPEC.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/spec/CURRENT-PROGRESS.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/spec/RESEARCH-NOTES.md'))).toBe(true);

    expect(fs.existsSync(path.join(repoRoot, 'APPLICATION-SPEC.md'))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, 'docs.md'))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, 'data'))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, 'spec'))).toBe(false);
  });
});
