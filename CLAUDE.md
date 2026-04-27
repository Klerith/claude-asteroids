# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

Open `index.html` directly in a browser, or serve with:

```bash
npx serve .
```

No build step, no bundler, no dependencies.

## Architecture

Single-file game (`game.js`) with a classic game loop — all logic is in one 420-line file.

**Classes:** `Bullet`, `Asteroid`, `Ship`, `Particle` — each has `update(dt)` and `draw()` methods, plus a `dead` flag for removal.

**Game state globals:** `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state` (`'playing' | 'dead' | 'gameover'`), `deadTimer`.

**Loop:** `requestAnimationFrame` → `loop(ts)` → `update(dt)` then `draw()`. `dt` is capped at 50ms to prevent spiral-of-death on tab blur.

**Wrapping:** All positions wrap toroidally via `wrap(v, max)`. Canvas is fixed 800×600.

**Asteroid sizes:** 1 (small), 2 (medium), 3 (large). `RADII`, `SPEEDS`, `POINTS` arrays are indexed by size. Splitting reduces size by 1; size 1 asteroids don't split.

**Input:** `keys` object tracks held keys; `justPressed` tracks single-frame presses (consumed on read via `pressed(code)`).

**Collision:** Circle vs circle using `dist()`. Ship collision uses `radius * 0.82` fudge factor for feel.
