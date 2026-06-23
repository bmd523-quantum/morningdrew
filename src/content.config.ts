// Place at: src/content.config.ts (replaces current)
// Adds style + era sorting flags. Both have defaults so existing posts
// (written before these flags existed) still validate — they inherit the
// launch retro era automatically.
import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string(),
    theme: z.enum(['coffee', 'camp', 'breakfast', 'breakfast-chili', 'sunrise', 'motivation']),
    style: z.string().default('retro-midcentury'),
    era: z.string().default('launch'),
  }),
});

export const collections = { blog };
