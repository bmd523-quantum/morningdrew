// Place at: astro.config.mjs (replaces the broken one)
// Astro 6 graduated the Fonts API to a top-level `fonts` block. The blog
// starter's BaseHead uses the Atkinson Hyperlegible font via the
// `--font-atkinson` CSS variable, so it MUST be declared here — otherwise
// you get "FontFamilyNotFound: --font-atkinson".
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { loadSitemapLastmodMap, sitemapLastmodForUrl } from './src/lib/sitemapLastmod.js';

const sitemapLastmod = loadSitemapLastmodMap();

export default defineConfig({
  site: 'https://goodmorning.pics',
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        const path = new URL(item.url).pathname;
        const lastmod = sitemapLastmodForUrl(item.url, sitemapLastmod);
        if (lastmod) item.lastmod = lastmod;

        if (path === '/') {
          return { ...item, changefreq: 'daily', priority: 1.0 };
        }
        if (path.startsWith('/blog/good-morning')) {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }
        if (path === '/blog/' || path === '/blog') {
          return { ...item, changefreq: 'daily', priority: 0.9 };
        }
        if (path.startsWith('/monday') || path.startsWith('/tuesday') ||
            path.startsWith('/wednesday') || path.startsWith('/thursday') ||
            path.startsWith('/friday') || path.startsWith('/saturday') ||
            path.startsWith('/sunday') || path.startsWith('/coffee') ||
            path.startsWith('/sunrise') || path.startsWith('/breakfast') ||
            path.startsWith('/camp') || path.startsWith('/quotes')) {
          return { ...item, changefreq: 'weekly', priority: 0.75 };
        }
        return item;
      },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Atkinson Hyperlegible',
      cssVariable: '--font-atkinson',
    },
  ],
});
