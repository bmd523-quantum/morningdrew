/** IndexNow helpers — shared by post-build script and Vercel cron route. */

export const SITE_ORIGIN = 'https://goodmorning.pics';
export const SITE_HOST = new URL(SITE_ORIGIN).host;
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
export const DEFAULT_INDEXNOW_KEY = 'b6b611241b904d348a4855288520bc4e';

export function getIndexNowKey() {
	return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
}

/** Extract absolute URLs from a sitemap urlset or sitemap index document. */
export function urlsFromSitemapXml(xml) {
	const urls = [];
	for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		urls.push(m[1].trim());
	}
	return urls;
}

/** Resolve a sitemap index into all page URLs (follows child sitemap locs). */
export async function collectUrlsFromSitemapIndex(indexXml, fetchImpl = fetch) {
	const locs = urlsFromSitemapXml(indexXml);
	const pageUrls = [];

	for (const loc of locs) {
		if (/\/sitemap-\d+\.xml$/i.test(loc) || loc.endsWith('.xml')) {
			const childRes = await fetchImpl(loc);
			if (!childRes.ok) {
				throw new Error(`Failed to fetch child sitemap ${loc}: ${childRes.status}`);
			}
			pageUrls.push(...urlsFromSitemapXml(await childRes.text()));
		} else {
			pageUrls.push(loc);
		}
	}

	return [...new Set(pageUrls)];
}

export async function collectUrlsFromDist(distDir) {
	const { readFileSync, readdirSync, existsSync } = await import('node:fs');
	const { resolve } = await import('node:path');

	const read = (name) => readFileSync(resolve(distDir, name), 'utf8');
	let urls = [];

	const indexPath = resolve(distDir, 'sitemap-index.xml');
	if (existsSync(indexPath)) {
		const childNames = urlsFromSitemapXml(read('sitemap-index.xml'))
			.map((loc) => loc.replace(/^.*\//, ''))
			.filter((name) => name.endsWith('.xml'));

		for (const name of childNames) {
			if (existsSync(resolve(distDir, name))) {
				urls.push(...urlsFromSitemapXml(read(name)));
			}
		}
	}

	if (urls.length === 0) {
		for (const name of readdirSync(distDir)) {
			if (/^sitemap-\d+\.xml$/.test(name)) {
				urls.push(...urlsFromSitemapXml(read(name)));
			}
		}
	}

	return [...new Set(urls)];
}

export async function submitToIndexNow(urlList, fetchImpl = fetch) {
	const key = getIndexNowKey();
	const payload = {
		host: SITE_HOST,
		key,
		keyLocation: `${SITE_ORIGIN}/${key}.txt`,
		urlList,
	};

	const res = await fetchImpl(INDEXNOW_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify(payload),
	});

	const text = await res.text();
	if (!res.ok) {
		throw new Error(`IndexNow API ${res.status}: ${text.slice(0, 500)}`);
	}

	return { submitted: urlList.length, httpStatus: res.status, body: text };
}
