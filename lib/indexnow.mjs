/** IndexNow helpers — shared by post-build script and Vercel cron route. */

export const SITE_ORIGIN = 'https://goodmorning.pics';
export const SITE_HOST = new URL(SITE_ORIGIN).host;
export const DEFAULT_INDEXNOW_KEY = 'b6b611241b904d348a4855288520bc4e';

export const INDEXNOW_ENDPOINTS = [
	{ url: 'https://www.bing.com/indexnow', name: 'Bing' },
	{ url: 'https://api.indexnow.org/IndexNow', name: 'IndexNow.org' },
	{ url: 'https://yandex.com/indexnow', name: 'Yandex' },
	{ url: 'https://search.seznam.cz/indexnow', name: 'Seznam' },
];

export function getIndexNowKey() {
	return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
}

export function keyLocation() {
	const key = getIndexNowKey();
	return `${SITE_ORIGIN}/${key}.txt`;
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

export async function collectUrlsFromLiveSitemap(fetchImpl = fetch) {
	const indexRes = await fetchImpl(`${SITE_ORIGIN}/sitemap-index.xml`);
	if (!indexRes.ok) {
		throw new Error(`sitemap-index.xml returned ${indexRes.status}`);
	}
	return collectUrlsFromSitemapIndex(await indexRes.text(), fetchImpl);
}

/** Ping all IndexNow endpoints. Never throws — logs warnings and returns per-endpoint results. */
export async function pingIndexNow(urlList, fetchImpl = fetch) {
	if (!urlList.length) {
		console.warn('IndexNow: no URLs to submit');
		return { submitted: 0, results: [] };
	}

	const body = {
		host: SITE_HOST,
		key: getIndexNowKey(),
		keyLocation: keyLocation(),
		urlList,
	};

	const results = [];
	for (const { url, name } of INDEXNOW_ENDPOINTS) {
		try {
			const res = await fetchImpl(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: JSON.stringify(body),
			});
			const text = await res.text();
			const detail = res.ok ? '' : ` — ${text.slice(0, 120)}`;
			console.log(
				`IndexNow → ${name}: ${res.status} (${urlList.length} URL${urlList.length === 1 ? '' : 's'})${detail}`,
			);
			results.push({ name, ok: res.ok, status: res.status, detail: text.slice(0, 200) });
		} catch (err) {
			console.warn(`IndexNow → ${name} failed:`, err.message);
			results.push({ name, ok: false, error: err.message });
		}
	}

	const anyOk = results.some((r) => r.ok);
	return { submitted: urlList.length, anyOk, results };
}

/** @deprecated use pingIndexNow */
export async function submitToIndexNow(urlList, fetchImpl = fetch) {
	const out = await pingIndexNow(urlList, fetchImpl);
	if (!out.anyOk && out.results.length) {
		const first = out.results.find((r) => r.detail || r.error);
		throw new Error(
			first?.detail || first?.error || 'IndexNow submission failed on all endpoints',
		);
	}
	return {
		submitted: out.submitted,
		httpStatus: out.results.find((r) => r.ok)?.status ?? 0,
	};
}
