# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

An Asteroids-style arcade game built on the plain HTML5 Canvas. It has no dependencies, no bundler, no build step, no linter and no tests. All game logic is in `game.js`, which `index.html` loads with a plain `<script>` tag (not a module). UI text, comments and the README are in Spanish, so keep new user-facing strings and comments in Spanish to match.

## Running

Open `index.html` directly in a browser, or serve it locally:

```bash
npx serve .   # then visit http://localhost:3000
```

The game is deployed to GitHub Pages (demo link in README.md).

## Architecture (`game.js`)

- **Global canvas/context**: `canvas`, `ctx`, `W = 800` and `H = 600` are module-level globals. Every class's `draw()` uses `ctx` directly. `W`/`H` repeat the canvas `width`/`height` attributes in `index.html`, so if you change the canvas size, change it in both places.
- **Input**: `keys[code]` holds which keys are currently down (used for continuous rotation and thrust). `justPressed[code]` combined with `pressed(code)` gives a one-shot edge trigger: reading it consumes it. This is used for Space (shooting and restarting).
- **Entities**: `Bullet`, `Asteroid`, `Ship` and `Particle` all follow the same pattern: `update(dt)` takes seconds, `draw()` renders, and a `dead` flag marks removal. The main `update()` filters out dead entities after each step instead of removing them mid-loop.
- **Toroidal space**: positions are wrapped with `wrap(v, max)`. Particles are the only entities that don't wrap.
- **Asteroid sizes**: `size` is 3 (large), 2 (medium) or 1 (small). It indexes the parallel arrays `RADII`, `SPEEDS` and `POINTS`, where index 0 is unused. `split()` returns two asteroids of `size - 1`, or nothing for size 1.
- **State machine**: the global `state` is `'playing'`, `'dead'` (2 s respawn delay counted by `deadTimer`) or `'gameover'` (press Space to call `initGame()`). `update()` branches on `state` first. Clearing all asteroids calls `nextLevel()`, which spawns `3 + level` large asteroids at least `SAFE_DIST` away from the center.
- **Collisions**: circle-distance checks via `dist()`. The ship's hitbox uses `a.radius * 0.82` to be forgiving, and collisions are skipped while `ship.invincible > 0` (3 s after a respawn, shown as blinking).
- **Loop**: `requestAnimationFrame`, with `dt` capped at 0.05 s so the game doesn't jump forward after the tab loses focus.

## Notes

- README.md still mentions power-ups and a "shooting star" asteroid, but they were removed (commit 13e713f). The code is the source of truth.
