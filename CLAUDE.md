# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Responder siempre en español.

## Proyecto

Juego de Asteroides 2D en canvas HTML5. Sin dependencias ni bundler — se abre directamente con `index.html` en el navegador.

## Cómo ejecutar

Abrir `index.html` en el navegador (doble clic o con un servidor local):

```bash
npx serve .
# o simplemente abrir index.html en el navegador
```

## Arquitectura

Todo el juego vive en `game.js` (un solo archivo, sin módulos). Estructura:

- **Input**: `keys` (estado continuo) + `justPressed` (disparo único por pulsación). Usa `e.code` para teclas.
- **Clases**: `Ship`, `Asteroid`, `Bullet`, `Particle` — cada una con métodos `update(dt)` y `draw()`.
- **Estado global**: `state` puede ser `'playing'`, `'dead'` o `'gameover'`. Las funciones `update()` y `draw()` ramifican según este valor.
- **Loop**: `requestAnimationFrame` con delta time en segundos (`dt`). `dt` se limita a 0.05 s para evitar saltos grandes.
- **Wrapping**: función `wrap(v, max)` aplica envoltura de bordes a nave, balas y asteroides.
- **Colisiones**: detección por distancia entre círculos (`dist(a, b) < radios`).

## Controles

| Tecla       | Acción          |
|-------------|-----------------|
| ← →         | Rotar nave      |
| ↑           | Propulsar       |
| Espacio     | Disparar        |

## Constantes clave

- Canvas: 800 × 600 px
- Tamaños de asteroide: 3 (grande), 2 (mediano), 1 (pequeño) — se parten al recibir un disparo
- Puntos: grande=20, mediano=50, pequeño=100
- Vidas: 3 al inicio
- Invencibilidad al reaparecer: 3 segundos (con parpadeo)
