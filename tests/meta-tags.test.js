import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

const repoRoot = path.resolve(import.meta.dirname, '..');

function parseHTML(relativePath) {
  const raw = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const window = new Window();
  window.document.write(raw);
  return window.document;
}

function getMeta(doc, value) {
  const el = doc.querySelector(`meta[property="${value}"]`) || doc.querySelector(`meta[name="${value}"]`);
  return el ? el.getAttribute('content') : null;
}

describe('reword meta tags', () => {
  const doc = parseHTML('reword/index.html');

  it('has Open Graph title, description, image, and type', () => {
    expect(getMeta(doc,'og:title')).toBe('Reword');
    expect(getMeta(doc,'og:description')).toBeTruthy();
    expect(getMeta(doc,'og:image')).toMatch(/^https:\/\//);
    expect(getMeta(doc,'og:type')).toBe('website');
  });

  it('has Twitter Card tags', () => {
    expect(getMeta(doc,'twitter:card')).toBe('summary_large_image');
    expect(getMeta(doc,'twitter:title')).toBe('Reword');
    expect(getMeta(doc,'twitter:description')).toBeTruthy();
    expect(getMeta(doc,'twitter:image')).toMatch(/^https:\/\//);
  });

  it('has a meta description', () => {
    expect(getMeta(doc,'description')).toBeTruthy();
  });

  it('has an og:url pointing to the canonical URL', () => {
    expect(getMeta(doc,'og:url')).toBe('https://amolkapoor.com/games/reword/');
  });

  it('has an og:image file that exists on disk', () => {
    expect(fs.existsSync(path.join(repoRoot, 'games/reword/og-image.png'))).toBe(true);
  });

  it('has og:image in public/ so it deploys to the correct URL', () => {
    const ogImageUrl = getMeta(doc, 'og:image');
    const urlPath = new URL(ogImageUrl).pathname.replace('/games/', '');
    expect(fs.existsSync(path.join(repoRoot, 'public', urlPath))).toBe(true);
  });
});

describe('speedrun meta tags', () => {
  const doc = parseHTML('speedrun/index.html');

  it('has og:image in public/ so it deploys to the correct URL', () => {
    const ogImageUrl = getMeta(doc, 'og:image');
    const urlPath = new URL(ogImageUrl).pathname.replace('/games/', '');
    expect(fs.existsSync(path.join(repoRoot, 'public', urlPath))).toBe(true);
  });
});

describe('games index meta tags', () => {
  const doc = parseHTML('index.html');

  it('has Open Graph title, description, and type', () => {
    expect(getMeta(doc,'og:title')).toBe('Games');
    expect(getMeta(doc,'og:description')).toBeTruthy();
    expect(getMeta(doc,'og:type')).toBe('website');
  });

  it('has Twitter Card tags', () => {
    expect(getMeta(doc,'twitter:card')).toBeTruthy();
    expect(getMeta(doc,'twitter:title')).toBe('Games');
  });

  it('has a meta description', () => {
    expect(getMeta(doc,'description')).toBeTruthy();
  });
});

describe('games index card images', () => {
  const doc = parseHTML('index.html');

  it('reword card displays a preview image with alt text', () => {
    const rewordCard = doc.querySelector('a.game-card[href*="reword"]');
    const img = rewordCard.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toContain('og-image.png');
    expect(img.getAttribute('alt')).toBeTruthy();
  });
});
