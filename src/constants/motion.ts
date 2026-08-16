/**
 * Motion tokens — one vocabulary for the whole app.
 *
 * The aesthetic is a terminal, so motion is calm and precise: everything
 * decelerates smoothly into place with ZERO overshoot — nothing bounces or
 * wobbles. All springs are critically damped (`dampingRatio: 1`, which cannot
 * overshoot by construction); `duration` is the time to settle. Everything
 * runs on the UI thread via Reanimated; layout/entering animations respect
 * the system reduce-motion setting by default.
 *
 * Three tiers cover everything:
 *  - `glide` moves things to a new place (rows re-sorting between sections).
 *  - `stamp` lands a state change (a glyph swap, a count tick).
 *  - `press` is immediate touch feedback.
 */

import { Easing, FadeIn, FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";

export const Springs = {
  glide: { duration: 350, dampingRatio: 1 },
  stamp: { duration: 280, dampingRatio: 1 },
  press: { duration: 180, dampingRatio: 1 },
} as const;

const easeOut = Easing.out(Easing.cubic);

/** Rows gliding to their new slot after a toggle re-sorts the list. */
export const rowGlide = LinearTransition.duration(350).easing(easeOut);

/** Rows appearing (added todo, expanded subtree, new section). */
export const rowIn = FadeIn.duration(220);

/** Rows leaving (deleted todo, collapsed subtree, emptied section). */
export const rowOut = FadeOut.duration(160);

/** The add button easing into place on launch. */
export const fabIn = ZoomIn.duration(320).easing(easeOut).delay(150);
