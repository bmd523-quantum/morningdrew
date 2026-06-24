/**
 * Vercel cron — triggers a production redeploy so static "Today" picks up the new date.
 * Set DEPLOY_HOOK_URL in Vercel env (Settings → Git → Deploy Hooks).
 * Scheduled at 04:00 and 05:00 UTC; only fires when it's midnight in America/New_York (DST-safe).
 */
function isEasternMidnight(): boolean {
	const hour = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		hour: 'numeric',
		hour12: false,
	}).format(new Date());
	return hour === '0' || hour === '00';
}

export default async function handler(req, res) {
	const ua = req.headers['user-agent'] || '';
	if (!ua.includes('vercel-cron')) {
		res.status(401).json({ ok: false, error: 'unauthorized' });
		return;
	}

	if (!isEasternMidnight()) {
		res.status(200).json({
			ok: true,
			skipped: true,
			reason: 'not midnight America/New_York',
		});
		return;
	}

	const hookUrl = process.env.DEPLOY_HOOK_URL;
	if (!hookUrl) {
		res.status(500).json({ ok: false, error: 'DEPLOY_HOOK_URL not configured' });
		return;
	}

	try {
		const response = await fetch(hookUrl, { method: 'POST' });
		const body = await response.text();
		res.status(200).json({
			ok: true,
			triggered_at: new Date().toISOString(),
			hook_status: response.status,
			hook_response: body.slice(0, 200),
		});
	} catch (err) {
		res.status(500).json({
			ok: false,
			error: 'hook call failed',
			detail: err instanceof Error ? err.message : String(err),
		});
	}
}

export const config = {
	maxDuration: 30,
};
