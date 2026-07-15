// Place at: src/content.config.ts (replaces current)
// Astro 5 layout. NOTE: there is a second copy at src/overlay/src/content.config.ts
// which Astro does NOT load — only this file is live. Don't edit that one.
//
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
    // Release gating reads this. z.coerce.date() gives a real Date, so the
    // filter is `data.pubDate <= new Date()` — no string parsing.
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string(),

    // Era 2 (from 2026-09-01) gives every weekday its own theme, so no pool
    // is ever drawn from twice a week. `garden` (Wed) and `birds` (Thu) are
    // new; without them the first September Wednesday fails the build.
    // Kept as an enum on purpose — it catches a typo'd theme at build time
    // rather than at publish time.
    theme: z.enum([
      'coffee',           // Mon
      'sunrise',          // Tue
      'garden',           // Wed  — new in era 2
      'birds',            // Thu  — new in era 2
      'camp',             // Fri
      'breakfast',        // Sat
      'breakfast-chili',  // Sat, first of month (overrides breakfast)
      'motivation',       // Sun
    ]),

    // The scene actually drawn, written by publish_approved.py at publish
    // time and backfilled onto pre-existing posts by materialize_scenes.py.
    //
    // This is what decouples the scene pools from history. Before it existed,
    // backfill_pins.py re-derived each post's scene from its date via
    // pool[ordinal % len(pool)] — so adding a single scene to a pool silently
    // rewrote the alt text of every post already live and pinned.
    //
    // OPTIONAL, deliberately. If materialize_scenes.py skips a post (bad
    // frontmatter, unknown theme), a required field would take the whole
    // build down; optional lets it through and backfill_pins.py falls back to
    // the frozen legacy pools and warns. Tighten to required once
    // materialize has run clean across all posts and you want the guarantee.
    scene: z.string().optional(),

    style: z.string().default('retro-midcentury'),
    era: z.string().default('launch'),
  }),
});

export const collections = { blog };
