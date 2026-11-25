# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in plain HTML5 Canvas. No dependencies, no bundler, no tests, no linter. UI text and code comments are in Spanish; README is in Spanish.

## Running

Open `index.html` directly in a browser, or serve locally with `npx serve .` (http://localhost:3000). Reload the page to see changes.

## Architecture

Everything lives in `game.js` (loaded by `index.html`, which only provides a 800x600 `<canvas id="canvas">`). Sections, top to bottom:

- **Input**: `keys` (held state) and `justPressed` (edge-triggered). Read edge presses with `pressed(code)`, which consumes the flag. Shooting and restart use `pressed('Space')`; rotation/thrust read `keys` directly.
- **Entities** (`Bullet`, `Asteroid`, `Ship`, `Particle`): each has `update(dt)` and `draw()`, and a `dead` flag. Dead entities are removed by array filtering in `update()`, not inside the entity.
- **Game state**: module-level `let` globals (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`) and a `state` string: `'playing' | 'dead' | 'gameover'`. `update()` branches on `state`; in `'dead'` it runs a 2s respawn timer while asteroids and particles keep moving.
- **Loop**: `requestAnimationFrame` with `dt` in seconds, clamped to 0.05 to avoid big jumps after tab switches.

Key conventions:
- World is toroidal: positions use `wrap(v, max)` with the fixed constants `W`/`H` (800/600). Changing canvas size means updating both `W`/`H` in `game.js` and the canvas attributes in `index.html`.
- Collisions are circle-based using `radius` and `dist()`. Ship vs asteroid uses `a.radius * 0.82` as a forgiveness factor; the ship is skipped while `ship.invincible > 0`.
- Asteroid size tables `RADII`, `SPEEDS`, `POINTS` are indexed by size 1–3 (index 0 unused). Note the README's score table matches `POINTS`: large=20, medium=50, small=100.
- Level clear is `asteroids.length === 0` → `nextLevel()` spawns `3 + level` large asteroids outside a safe radius around the center.
