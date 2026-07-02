#!/usr/bin/env node
/**
 * Regenerate src/data/sitemap-lastmod.json before each build.
 * Blog/hub dates from post frontmatter; static pages from git last commit.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = resolve(root, 'src/content/blog');
const outPath = resolve(root, 'src/data/sitemap-lastmod.json');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HUB_THEMES = {
	coffee: ['coffee'],
	sunrise: ['sunrise'],
	breakfast: ['breakfast', 'breakfast-chili'],
	camp: ['camp'],
	quotes: ['motivation'],
};

const STATIC_PAGES = {
	'/about/': 'src/pages/about.astro',
	'/contact/': 'src/pages/contact.astro',
	'/privacy/': 'src/pages/privacy.astro',
	'/era/launch/': 'src/pages/era/[era].astro',
	'/style/retro-midcentury/': 'src/pages/style/[style].astro',
};

function maxDate(...dates) {
	return dates.filter(Boolean).sort().at(-1);
}

function gitLastCommitDate(relPath) {
	try {
		return execSync(`git log -1 --format=%cs -- "${relPath}"`, {
			cwd: root,
			encoding: 'utf8',
		}).trim();
	} catch {
		return null;
	}
}

function parsePost(file) {
	const text = readFileSync(file, 'utf8');
	const pubDate = text.match(/^pubDate:\s*['"]?([^'"\n]+)/m)?.[1]?.trim();
	const theme = text.match(/^theme:\s*['"]?([^'"\n]+)/m)?.[1]?.trim();
	if (!pubDate) return null;
	const slug = basename(file, '.md');
	const weekday = DAYS[new Date(`${pubDate}T00:00:00Z`).getUTCDay()];
	return { slug, pubDate, theme, weekday };
}

const posts = readdirSync(blogDir)
	.filter((f) => f.endsWith('.md'))
	.map((f) => parsePost(resolve(blogDir, f)))
	.filter(Boolean);

const map = {};

for (const post of posts) {
	map[`/blog/${post.slug}/`] = post.pubDate;
}

const latestPostDate = maxDate(...posts.map((p) => p.pubDate));
if (latestPostDate) {
	map['/'] = latestPostDate;
	map['/blog/'] = latestPostDate;
}

for (const [slug, themes] of Object.entries(HUB_THEMES)) {
	const dates = posts.filter((p) => themes.includes(p.theme)).map((p) => p.pubDate);
	const last = maxDate(...dates);
	if (last) map[`/${slug}/`] = last;
}

for (const day of DAYS) {
	const slug = day.toLowerCase();
	const dates = posts.filter((p) => p.weekday === day).map((p) => p.pubDate);
	const last = maxDate(...dates);
	if (last) map[`/${slug}/`] = last;
}

for (const [path, relFile] of Object.entries(STATIC_PAGES)) {
	const fromGit = gitLastCommitDate(relFile);
	if (fromGit) map[path] = fromGit;
}

writeFileSync(outPath, `${JSON.stringify(map, null, 2)}\n`);
console.log(`sitemap-lastmod: wrote ${Object.keys(map).length} entries → ${outPath}`);
