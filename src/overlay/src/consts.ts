// Place at: src/consts.ts
// The "brain" of Good Morning Pics. Theme is the single source of truth — both the
// per-post contextual brand link and (later) the Pillow generator read from here.

export const SITE_TITLE = 'Good Morning Pics';
export const SITE_DESCRIPTION = 'A new drawing every morning.';
export const SITE_URL = 'https://goodmorning.pics';

// The three properties Morning Drew points back to.
export const BRANDS = {
  dragonfly: { name: 'Dragonfly Supply', url: 'https://dragonflysupply.com' },
  day9:      { name: 'day9.coffee',      url: 'https://day9.coffee' },
  chili:     { name: 'ChiliStation',     url: 'https://chilistation.com' },
} as const;

// Footer shows all three on every page, quietly.
export const FOOTER_BRANDS = [BRANDS.dragonfly, BRANDS.day9, BRANDS.chili];

// Theme -> contextual brand link (null = footer only, no body link).
export const THEME_BRAND: Record<string, keyof typeof BRANDS | null> = {
  coffee:            'day9',
  camp:              'dragonfly',
  breakfast:         'dragonfly',
  'breakfast-chili': 'chili',
  sunrise:           null,
  motivation:        null,
};

// Friendly CTA copy for the in-body link, per theme.
export const THEME_CTA: Record<string, string> = {
  coffee:            'Start your morning right',
  camp:              'Plan your first family campout',
  breakfast:         'Easy morning recipes',
  'breakfast-chili': 'Cozy breakfast chili ideas',
};
