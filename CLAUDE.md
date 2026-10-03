# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Clon de Asteroids en canvas HTML5 puro. Sin dependencias, sin bundler, sin `package.json`, sin tests ni linter. Todo el código está en tres archivos: `index.html` (canvas 800x600 + estilos), `game.js` (toda la lógica) y `favicon.svg`.

## Correr

Abrir `index.html` en el navegador, o servir con `npx serve .` (http://localhost:3000). No hay paso de build. Para verificar un cambio hay que jugar en el navegador.

## Arquitectura de `game.js`

Un solo script en modo estricto, sin módulos. Secciones en orden:

- **Input**: `keys[code]` guarda teclas mantenidas; `justPressed` + `pressed(code)` detecta flancos de pulsación y se consume al leerse (se usa para disparar con `Space` y reiniciar). Hay que usar `pressed()` para acciones de un solo disparo y `keys[]` para acciones continuas.
- **Entidades** (`Bullet`, `Asteroid`, `Ship`, `Particle`): cada clase tiene `update(dt)` y `draw()` y un flag `dead`; las listas se filtran por `dead` después de actualizar. `dt` está en segundos.
- **Estado global**: variables `let` de módulo (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`, `deadTimer`). `initGame()` las reinicia.
- **Máquina de estados** `state`: `'playing'` → `'dead'` (2 s de espera tras perder una vida, luego `ship.reset()`) → `'playing'`, o `'gameover'` (Espacio llama `initGame()`). `update()` maneja cada estado con retorno temprano.
- **Loop**: `requestAnimationFrame`, con `dt` limitado a 0.05 s.

Detalles que cruzan varias partes:

- El mundo es toroidal: todo usa `wrap(v, max)` con `W`/`H` (800/600) como límites, excepto `Particle`, que no hace wrap.
- Los tamaños de asteroide (1 a 3) indexan los arreglos paralelos `RADII`, `SPEEDS` y `POINTS` (el índice 0 es relleno). Los grandes valen menos puntos que los pequeños. `Asteroid.split()` devuelve dos del tamaño inferior. Los grandes tienen 25 % de probabilidad (`BIG_SHAPE_CHANCE`) de usar la forma fija `BIG_SHAPE` en vez de un polígono aleatorio. Cualquier tamaño tiene 25 % (`HEART_CHANCE`) de ser un corazón (`HEART_SHAPE`).
- Colisiones: círculos con `dist()`. Nave contra asteroide usa `a.radius * 0.82` y se ignora mientras `ship.invincible > 0` (3 s tras `reset()`, la nave parpadea al dibujarse).
- Al limpiar todos los asteroides, `nextLevel()` genera `3 + level` asteroides grandes fuera de un radio seguro de 130 px del centro.
- Los textos de UI están en español.

- **Power-ups** (`POWERUP_TYPES`, tabla con letra, color, duración, `start`/`every`): triple (T, cada nivel), escudo (E, niveles 2,4,6…), slow (S, 3,6,9…), hiper (H, 4,7,10…), nova (N, 5,10…). `planDrops()` se llama en `initGame()` y `nextLevel()` y sortea en qué destrucción (1..`POWERUP_MAX_KILLS`) cae cada ítem del nivel (garantizado). Los efectos temporales viven en `fx` (timers en segundos, se apilan; recoger otra vez reinicia el timer); la nova se guarda en `novaStock` y se usa con `B` (`useNova()` destruye todos los asteroides sin split). El escudo absorbe un golpe y da 1 s de invencibilidad; slow multiplica el `dt` de los asteroides por `SLOW_FACTOR`; hiper multiplica empuje y giro de `Ship.update`. Morir llama `clearEffects()` (conserva `novaStock`). Audio con WebAudio (`beep`), el contexto se crea en el primer `keydown`. UI: barras por efecto en `drawHUD()`, escudo/aviso/flash en `drawEffects()`.

## Notas

- El `README.md` aún menciona power-ups variados y "estrella fugaz", pero fueron eliminados del código (commit `13e713f`); solo existe el triple disparo.
