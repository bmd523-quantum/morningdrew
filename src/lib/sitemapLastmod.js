import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAP_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../data/sitemap-lastmod.json',
);

export function loadSitemapLastmodMap() {
  try {
    return JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function normalizeSitemapPath(pathname) {
  if (!pathname || pathname === '') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export function sitemapLastmodForUrl(url, map) {
  const key = normalizeSitemapPath(new URL(url).pathname);
  return map[key];
}
