/**
 * Daily IndexNow submission (Bing, Yandex, etc.) for all public URLs.
 * Verify ownership: public/{INDEXNOW_KEY}.txt — https://www.indexnow.org/
 * Cron + manual GET/POST. Optional INDEXNOW_KEY env must match the .txt filename.
 */
import {
	SITE_ORIGIN,
	collectUrlsFromSitemapIndex,
	getIndexNowKey,
	submitToIndexNow,
} from '../lib/indexnow.mjs';

export default async function handler(req, res) {
	if (req.method !== 'GET' && req.method !== 'POST') {
		res.setHeader('Allow', 'GET, POST');
		res.status(405).json({ ok: false, message: 'Method not allowed' });
		return;
	}

	let urlList;
	try {
		const indexRes = await fetch(`${SITE_ORIGIN}/sitemap-index.xml`);
		if (!indexRes.ok) {
			throw new Error(`sitemap-index.xml returned ${indexRes.status}`);
		}
		urlList = await collectUrlsFromSitemapIndex(await indexRes.text());
	} catch (e) {
		console.error('indexnow: failed to collect URLs', e);
		res.status(500).json({ ok: false, message: 'Failed to collect URLs' });
		return;
	}

	if (urlList.length === 0) {
		res.status(500).json({ ok: false, message: 'No URLs in sitemap' });
		return;
	}

	try {
		const result = await submitToIndexNow(urlList);
		res.status(200).json({
			ok: true,
			submitted: result.submitted,
			key: getIndexNowKey(),
			indexNowHttpStatus: result.httpStatus,
		});
	} catch (e) {
		console.error('indexnow: request failed', e);
		res.status(502).json({ ok: false, message: e.message || 'IndexNow request failed' });
	}
}

export const config = {
	maxDuration: 60,
};
