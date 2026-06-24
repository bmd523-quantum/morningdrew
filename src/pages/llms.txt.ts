import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL } from '../consts';
import { HUBS, DAY_HUBS } from '../hubs';

export const prerender = true;

export const GET: APIRoute = async () => {
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
	const recent = posts.slice(0, 14);

	const body = [
		`# ${SITE_TITLE}`,
		'',
		`> ${SITE_DESCRIPTION} Original retro hand-drawn good morning pictures — one per calendar day — with shareable WebP images for Pinterest, social media, and messaging.`,
		'',
		'Each post is a dated drawing for a specific weekday (for example, Happy Tuesday). Browse by mood (coffee, sunrise, camp, breakfast, quotes) or by day of the week. Use the share buttons on each post to save or share the image.',
		'',
		'## Main pages',
		`- [Home](${SITE_URL}/): Today's featured drawing and browse hubs.`,
		`- [All mornings](${SITE_URL}/blog/): Full archive of published drawings.`,
		`- [About](${SITE_URL}/about/): About Good Morning Pics and the daily art.`,
		`- [Contact](${SITE_URL}/contact/): Email hello@goodmorning.pics.`,
		`- [Privacy](${SITE_URL}/privacy/): Privacy policy for the site.`,
		`- [RSS feed](${SITE_URL}/rss.xml): Feed with image enclosures for Pinterest automation.`,
		'',
		'## Browse by mood',
		...HUBS.map(
			(h) =>
				`- [${h.title}](${SITE_URL}/${h.slug}/): ${h.intro.split('.')[0]}.`,
		),
		'',
		'## Browse by weekday',
		...DAY_HUBS.map(
			(h) =>
				`- [${h.title}](${SITE_URL}/${h.slug}/): ${h.intro.split('.')[0]}.`,
		),
		'',
		'## Recent daily posts',
		...recent.map((p) => {
			const d = p.data.pubDate.toISOString().slice(0, 10);
			return `- [${p.data.title}](${SITE_URL}/blog/${p.id}/): ${p.data.description} (${d})`;
		}),
		'',
		'## Optional',
		`- [Retro mid-century style](${SITE_URL}/style/retro-midcentury/): Drawings in the launch retro style.`,
		`- [Launch era](${SITE_URL}/era/launch/): Drawings from the launch art era.`,
		`- [Sitemap](${SITE_URL}/sitemap-index.xml): Full URL list for crawlers.`,
		`- [Robots](${SITE_URL}/robots.txt): Crawler rules and sitemap pointer.`,
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
