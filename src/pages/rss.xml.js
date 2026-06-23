// Place at: src/pages/rss.xml.js (replaces the stock file)
// Adds an image <enclosure> per item so RSS-to-Pinterest tools (Tailwind)
// can attach the drawing to each auto-pin. Newest first.
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      enclosure: {
        url: new URL(post.data.heroImage, context.site).href,
        length: 0,
        type: 'image/webp',
      },
    })),
  });
}
