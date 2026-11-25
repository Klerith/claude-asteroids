# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids-style arcade game in plain HTML5 Canvas + vanilla JavaScript (ES6+). No dependencies, no bundler, no build step, no tests, no linter. UI text and code comments are in Spanish.

## Running

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve .   # then visit http://localhost:3000
```

There is nothing to compile. Reload the page to see changes.

## Architecture

All game logic lives in `game.js`, loaded by `index.html` as a classic (non-module) script with `'use strict'`. Everything is global, so there are no imports or exports.

- **Fixed canvas size**: `W = 800`, `H = 600` are hardcoded in `game.js` and must stay in sync with the `<canvas>` attributes in `index.html`.
- **Toroidal space**: entity positions go through `wrap()`. Particles are the exception and do not wrap.
- **Entity classes** (`Bullet`, `Asteroid`, `Ship`, `Particle`) all follow the same shape: `update(dt)`, `draw()` and a `dead` flag. The main `update()` calls each entity's update, then removes dead ones with `filter(x => !x.dead)`.
- **Asteroid sizes** are integers 3 (large) → 2 → 1 (small). The lookup tables `RADII`, `SPEEDS` and `POINTS` are indexed by size, and index 0 is unused. `split()` returns two asteroids one size smaller.
- **Game state** is held in module-level `let` variables (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`, `deadTimer`). `state` is `'playing' | 'dead' | 'gameover'`. `initGame()` resets everything; `nextLevel()` spawns `3 + level` asteroids once the field is cleared.
- **Input**: `keys[code]` holds keys that are currently down. `pressed(code)` is edge-triggered and consumes the press, so use it for one-shot actions such as shooting or restarting.
- **Loop**: `requestAnimationFrame` with delta time in seconds, capped at 0.05 s. All movement constants are per-second values multiplied by `dt`.
- **Collisions** are circle-vs-circle via `dist()`. Ship-vs-asteroid collisions use `a.radius * 0.82` to be forgiving, and they are skipped while `ship.invincible > 0` (3 s after respawn, shown as blinking).

## Notes

- `README.md` still mentions power-ups and a "shooting star" asteroid. Those were removed in commit `13e713f` and no longer exist in the code.
- The README demo is hosted on GitHub Pages, so the repo root is served as-is.
