// Place at: src/hubs.ts
// Two browse axes, both auto-built from existing post fields:
//   HUBS      — by mood/theme  (/coffee, /sunrise, ...)
//   DAY_HUBS  — by weekday      (/monday, /tuesday, ...) — the highest-volume
//               keyword cluster ("good morning monday/tuesday/...").
// Imported by index.astro and [hub].astro. Adding a post updates both
// automatically; no per-page upkeep.

export const HUBS = [
  {
    slug: 'coffee',
    title: 'Good Morning Coffee',
    themes: ['coffee'],
    intro:
      'Cozy good morning coffee pictures to start your day. Warm cups, soft morning light, and a calm moment before everything begins — fresh original art, new every morning.',
  },
  {
    slug: 'sunrise',
    title: 'Sunrise & Morning Skies',
    themes: ['sunrise'],
    intro:
      'Peaceful sunrise pictures and morning sky art. Calming good morning images to greet a brand-new day, hand-drawn in a warm retro style.',
  },
  {
    slug: 'breakfast',
    title: 'Cozy Morning & Breakfast',
    themes: ['breakfast', 'breakfast-chili'],
    intro:
      'Warm breakfast tables and cozy good morning scenes. Hand-drawn art for slow, happy mornings and an unhurried start to the day.',
  },
  {
    slug: 'camp',
    title: 'Camp Mornings',
    themes: ['camp'],
    intro:
      'Good morning from the great outdoors. Misty campsites, quiet sunrises over the trees, and the best part of any trip — the early morning.',
  },
  {
    slug: 'quotes',
    title: 'Good Morning Quotes',
    themes: ['motivation'],
    intro:
      'Uplifting good morning quotes to share and start the day right. A fresh original good morning quote every week, hand-lettered in a warm retro style.',
  },
] as const;

const dayIntro = (day: string) =>
  `Good morning ${day} pictures, fresh every week. Hand-drawn good morning ${day} images to share and brighten someone's ${day} — new original art each ${day} morning.`;

export const DAY_HUBS = [
  { slug: 'monday',    title: 'Good Morning Monday',    weekday: 'Monday',    intro: dayIntro('Monday') },
  { slug: 'tuesday',   title: 'Good Morning Tuesday',   weekday: 'Tuesday',   intro: dayIntro('Tuesday') },
  { slug: 'wednesday', title: 'Good Morning Wednesday', weekday: 'Wednesday', intro: dayIntro('Wednesday') },
  { slug: 'thursday',  title: 'Good Morning Thursday',  weekday: 'Thursday',  intro: dayIntro('Thursday') },
  { slug: 'friday',    title: 'Good Morning Friday',    weekday: 'Friday',    intro: dayIntro('Friday') },
  { slug: 'saturday',  title: 'Good Morning Saturday',  weekday: 'Saturday',  intro: dayIntro('Saturday') },
  { slug: 'sunday',    title: 'Good Morning Sunday',    weekday: 'Sunday',    intro: dayIntro('Sunday') },
] as const;
