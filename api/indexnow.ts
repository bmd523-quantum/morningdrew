/**
 * Daily IndexNow submission (Bing, Yandex, etc.) for all public URLs.
 * Verify ownership: public/{INDEXNOW_KEY}.txt — https://www.indexnow.org/
 * Cron + manual GET/POST. Tries multiple endpoints; does not fail on 403 from one.
 */
import {
	collectUrlsFromLiveSitemap,
	getIndexNowKey,
	pingIndexNow,
} from '../lib/indexnow.mjs';

export default async function handler(req, res) {
	if (req.method !== 'GET' && req.method !== 'POST') {
		res.setHeader('Allow', 'GET, POST');
		res.status(405).json({ ok: false, message: 'Method not allowed' });
		return;
	}

	let urlList;
	try {
		urlList = await collectUrlsFromLiveSitemap();
	} catch (e) {
		console.error('indexnow: failed to collect URLs', e);
		res.status(500).json({ ok: false, message: 'Failed to collect URLs' });
		return;
	}

	if (urlList.length === 0) {
		res.status(500).json({ ok: false, message: 'No URLs in sitemap' });
		return;
	}

	const out = await pingIndexNow(urlList);
	res.status(200).json({
		ok: out.anyOk,
		submitted: out.submitted,
		key: getIndexNowKey(),
		endpoints: out.results,
	});
}

export const config = {
	maxDuration: 60,
};
