// Place at: src/content.config.ts (replaces the stock file)
// heroImage is a string path under /public (e.g. "/drawings/good-morning-tuesday-2026-06-23.webp"),
// which gives Pinterest's RSS the absolute image URLs it needs and lets the
// Pillow generator just drop a PNG in a folder. theme drives the brand link.

import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string(), // e.g. "/drawings/good-morning-tuesday-2026-06-23.webp"
    theme: z.enum(['coffee', 'camp', 'breakfast', 'breakfast-chili', 'sunrise', 'motivation']),
  }),
});

export const collections = { blog };
