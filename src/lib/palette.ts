import { CATEGORY_HUES, ThemeColors } from '@/constants/theme';

/**
 * Category color assignment — see DESIGN.md §2.
 *
 * One hash, one hue order, used by both the todo list and the calendar, so a tag
 * gets the same color everywhere. Accent (blue) and danger (red) are deliberately
 * NOT in the pool: blue means "time/today", red means "overdue/important". If a
 * category could borrow them the color system stops being readable.
 */

export type CategoryHue = (typeof CATEGORY_HUES)[number];

/** FNV-1a. Deterministic across launches, so a tag keeps its color forever. */
export function hashTag(tag: string): number {
  let hash = 2166136261;
  for (let i = 0; i < tag.length; i += 1) {
    hash = Math.imul(hash ^ tag.charCodeAt(i), 16777619);
  }
  return (hash ^ (hash >>> 15)) >>> 0;
}

/** The hue token for a tag, or null for untagged todos. */
export function categoryHueFor(tag: string): CategoryHue | null {
  if (!tag) return null;
  return CATEGORY_HUES[hashTag(tag) % CATEGORY_HUES.length];
}

/** Resolved category color for the active theme, or null when untagged. */
export function categoryColor(tag: string, colors: ThemeColors): string | null {
  const hue = categoryHueFor(tag);
  return hue ? colors[hue] : null;
}
