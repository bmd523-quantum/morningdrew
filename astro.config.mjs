// Place at: astro.config.mjs (replaces the broken one)
// Astro 6 graduated the Fonts API to a top-level `fonts` block. The blog
// starter's BaseHead uses the Atkinson Hyperlegible font via the
// `--font-atkinson` CSS variable, so it MUST be declared here — otherwise
// you get "FontFamilyNotFound: --font-atkinson".
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://goodmorning.pics',
  integrations: [mdx(), sitemap()],
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Atkinson Hyperlegible',
      cssVariable: '--font-atkinson',
    },
  ],
});
