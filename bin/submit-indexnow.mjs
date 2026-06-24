#!/usr/bin/env node
/**
 * Notify Bing/Yandex/etc. via IndexNow after a deploy.
 * Key file must be live at https://goodmorning.pics/<key>.txt (in /public).
 * Never fails the build — logs warnings and tries multiple endpoints (like dragonfly-supply).
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	collectUrlsFromDist,
	collectUrlsFromLiveSitemap,
	pingIndexNow,
} from '../lib/indexnow.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = resolve(root, 'dist');

async function main() {
	let urlList = [];

	try {
		urlList = await collectUrlsFromDist(dist);
	} catch {
		/* dist sitemap missing or unreadable */
	}

	if (!urlList.length) {
		console.warn('IndexNow: no URLs in dist/ — fetching live sitemap');
		try {
			urlList = await collectUrlsFromLiveSitemap();
		} catch (e) {
			console.warn('IndexNow: could not collect URLs:', e.message);
			return;
		}
	}

	await pingIndexNow(urlList);
}

main();
