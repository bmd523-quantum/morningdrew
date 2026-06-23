// Place at: astro.config.mjs (replaces the stock file)
// The ONLY critical change vs. the starter is `site` — it drives canonical
// URLs, the sitemap, and absolute image URLs in the RSS feed. The starter
// already includes mdx() and sitemap(); keep them.
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://goodmorning.pics',
  integrations: [mdx(), sitemap()],
});
