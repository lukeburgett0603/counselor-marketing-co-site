// Single source of truth for Icon.astro's fixed icon set — a plain .ts
// module (not exported from the .astro component) so it's importable
// both server-side (Icon.astro, ValueAddStrip.astro) and from a
// client-side admin <script> (page-copy.astro's Value Add strip icon
// picker), which can't import an .astro file directly.
export const ICON_NAMES = [
  'heart',
  'shield-check',
  'clock',
  'users',
  'star',
  'check-circle',
  'leaf',
  'book-open',
  'phone',
  'calendar',
  'home',
  'sparkles',
  'facebook',
  'instagram',
  'linkedin',
  'external-link',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

// The subset admins pick from for the Value Add strip / footer social
// links — excludes the 4 social-network icons there (offered separately
// for the footer's same_as links) and any icon that wouldn't read as a
// generic "value" concept.
export const VALUE_ADD_ICON_NAMES: IconName[] = [
  'heart',
  'shield-check',
  'clock',
  'users',
  'star',
  'check-circle',
  'leaf',
  'book-open',
  'phone',
  'calendar',
  'home',
  'sparkles',
];
