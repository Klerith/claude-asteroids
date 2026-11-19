# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone. Vanilla HTML5 Canvas + ES6, no dependencies, no bundler, no build step, no tests, no linter. README and code comments are in Spanish.

## Run

Open `index.html` in browser, or `npx serve .` then visit `http://localhost:3000`.

## Architecture

Whole game is in `game.js` (single classic script loaded by `index.html`, no modules). Canvas fixed at 800x600 (`W`/`H` constants in `game.js` must match `width`/`height` attrs in `index.html`).

- **Loop**: `loop(ts)` → `update(dt)` → `draw()`. `dt` clamped to 0.05s. All motion is dt-based (px/s).
- **State machine** (`state` global): `'playing'` | `'dead'` (2s respawn timer, ship hidden, asteroids keep moving) | `'gameover'` (Space restarts via `initGame()`). `update()` early-returns per state.
- **Globals**: `ship, bullets, asteroids, particles, score, lives, level` reassigned in `initGame()`/`nextLevel()`. Entity arrays are rebuilt with `.filter(!dead)` each frame; entities flag `dead = true` rather than splice.
- **Entities** (classes with `update(dt)`/`draw()`): `Ship`, `Bullet`, `Asteroid`, `Particle`. World is toroidal via `wrap()`; particles are the exception (no wrap).
- **Asteroid sizes** 1-3 indexed into `RADII`/`SPEEDS`/`POINTS` arrays (index 0 unused). `split()` returns two children of `size - 1`. Note POINTS: small = 100, large = 20.
- **Input**: `keys` (held) vs `justPressed` (edge-triggered, consumed by `pressed(code)`). Use `pressed('Space')` for fire/restart, `keys[...]` for rotate/thrust.
- **Collisions**: circle-based via `dist()`. Ship-vs-asteroid uses `a.radius * 0.82` forgiveness; ship has invincibility timer (`invincible`, blinking draw) after reset.
