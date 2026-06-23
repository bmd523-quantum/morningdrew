#!/usr/bin/env node
/**
 * Submit built URLs to IndexNow after astro build (Vercel deploy / rebuild).
 * Skipped locally unless SUBMIT_INDEXNOW=1.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectUrlsFromDist, submitToIndexNow } from '../lib/indexnow.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = resolve(root, 'dist');

async function main() {
	if (!process.env.VERCEL && process.env.SUBMIT_INDEXNOW !== '1') {
		console.log('submit-indexnow: skipped (set SUBMIT_INDEXNOW=1 to run locally)');
		return;
	}

	let urlList;
	try {
		urlList = await collectUrlsFromDist(dist);
	} catch (e) {
		console.error('submit-indexnow: failed to read sitemap from dist/', e.message);
		process.exit(1);
	}

	if (urlList.length === 0) {
		console.error('submit-indexnow: no URLs found in dist sitemap');
		process.exit(1);
	}

	try {
		const result = await submitToIndexNow(urlList);
		console.log(`submit-indexnow: submitted ${result.submitted} URL(s) (HTTP ${result.httpStatus})`);
	} catch (e) {
		console.error('submit-indexnow:', e.message);
		process.exit(1);
	}
}

main();
