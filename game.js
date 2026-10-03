'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  initAudio();
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Audio (WebAudio, sin archivos) ────────────────────────────────────────────
// El navegador exige un gesto del usuario: el contexto se crea en el primer keydown.
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
}

function beep(freq, dur, { type = 'square', vol = 0.06, slideTo = freq, delay = 0 } = {}) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

const sfxPickup = () => { beep(520, 0.08); beep(780, 0.12, { delay: 0.08 }); };
const sfxShield = () => beep(300, 0.3, { type: 'sawtooth', slideTo: 60 });
const sfxNova   = () => beep(900, 0.7, { type: 'sawtooth', vol: 0.12, slideTo: 40 });

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Variante fija de asteroide grande (vértices normalizados a radio ~1)
const BIG_SHAPE = [
  [-0.115, -1.000], [0.439, -0.835], [0.338, -0.223], [0.914, -0.050],
  [0.748,  0.576], [0.245,  0.554], [0.007,  0.950], [-0.698,  0.612],
  [-1.022, 0.029], [-0.871, -0.597],
];
const BIG_SHAPE_CHANCE = 0.25;

// Variante corazón (curva paramétrica), centrada y normalizada a radio 1
const HEART_SHAPE = (() => {
  const pts = [];
  const n = 20;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([
      16 * Math.sin(t) ** 3,
      -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    ]);
  }
  const ys = pts.map(p => p[1]);
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const centered = pts.map(([x, y]) => [x, y - cy]);
  const max = Math.max(...centered.map(([x, y]) => Math.hypot(x, y)));
  return centered.map(([x, y]) => [x / max, y / max]);
})();
const HEART_CHANCE = 0.25;

// Power-ups. Cada tipo sale una vez en los niveles `start`, `start + every`, ...
// en la destrucción N (1..POWERUP_MAX_KILLS) del nivel. Los timers se apilan.
const POWERUP_MAX_KILLS = 10;
const POWERUP_LIFETIME  = 8;     // s que el ítem espera en pantalla
const SPREAD            = 0.26;  // rad entre balas del abanico (~15°)
const SLOW_FACTOR       = 0.5;   // multiplicador de velocidad de asteroides
const HYPER_THRUST      = 2.2;   // multiplicador de aceleración
const HYPER_ROT         = 1.3;   // multiplicador de giro

const POWERUP_TYPES = {
  triple: { letter: 'T', label: 'TRIPLE', color: '#ffd23f', duration: 10, start: 1, every: 1, msg: 'TRIPLE DISPARO!' },
  shield: { letter: 'E', label: 'ESCUDO', color: '#4fc3ff', duration: 5,  start: 2, every: 2, msg: 'ESCUDO!' },
  slow:   { letter: 'S', label: 'SLOW',   color: '#b388ff', duration: 6,  start: 3, every: 3, msg: 'CAMARA LENTA!' },
  hyper:  { letter: 'H', label: 'HIPER',  color: '#ff7a45', duration: 8,  start: 4, every: 3, msg: 'HIPERPROPULSION!' },
  nova:   { letter: 'N', label: 'NOVA',   color: '#ff4f7b', duration: 0,  start: 5, every: 5, msg: 'NOVA LISTA - TECLA B' },
};

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const roll = Math.random();
    if (roll < HEART_CHANCE) {
      this.verts = HEART_SHAPE.map(([x, y]) => [x * this.radius, y * this.radius]);
    } else if (size === 3 && roll < HEART_CHANCE + BIG_SHAPE_CHANCE) {
      this.verts = BIG_SHAPE.map(([x, y]) => [x * this.radius, y * this.radius]);
    } else {
      // Polígono irregular
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const hyper  = fx.hyper > 0;
    const ROT    = 3.5 * (hyper ? HYPER_ROT : 1);     // rad/s
    const THRUST = 260 * (hyper ? HYPER_THRUST : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(triple = false) {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    const offsets = triple ? [-SPREAD, 0, SPREAD] : [0];
    return offsets.map(o => new Bullet(ox, oy, this.angle + o));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up ──────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 12;
    this.ttl  = POWERUP_LIFETIME;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo en los últimos 2 s
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;
    const { color, letter } = POWERUP_TYPES[this.type];
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle    = color;
    ctx.font         = 'bold 14px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, this.x, this.y + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let fx;             // segundos restantes por efecto: { triple, shield, slow, hyper }
let novaStock;      // bombas nova guardadas (tecla B)
let pendingDrops;   // [{ type, kills }] ítems del nivel aún no soltados
let banner;         // { text, color, ttl } aviso centrado
let novaFlash;      // s restantes del destello blanco
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function planDrops() {
  pendingDrops = Object.entries(POWERUP_TYPES)
    .filter(([, t]) => level >= t.start && (level - t.start) % t.every === 0)
    .map(([type]) => ({ type, kills: randInt(1, POWERUP_MAX_KILLS) }));
}

function clearEffects() {
  fx = { triple: 0, shield: 0, slow: 0, hyper: 0 };
}

function announce(text, color) {
  banner = { text, color, ttl: 1.4 };
}

function collectPowerUp(p) {
  const t = POWERUP_TYPES[p.type];
  if (p.type === 'nova') novaStock = 1;   // un solo uso: no se acumula
  else fx[p.type] = t.duration;           // recoger de nuevo reinicia el timer
  announce(t.msg, t.color);
  sfxPickup();
}

function useNova() {
  novaStock = 0;
  for (const a of asteroids) {
    score += POINTS[a.size];
    explode(a.x, a.y, a.size * 5);
    a.dead = true;   // sin split: se limpia la pantalla
  }
  novaFlash = 0.35;
  sfxNova();
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  clearEffects();
  novaStock = 0;
  banner    = null;
  novaFlash = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  planDrops();
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  planDrops();
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  clearEffects();   // perder una vida cancela los efectos; la nova guardada se conserva
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (banner && (banner.ttl -= dt) <= 0) banner = null;
  if (novaFlash > 0) novaFlash -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot(fx.triple > 0));
  }
  if (pressed('KeyB') && novaStock > 0) useNova();

  ship.update(dt);
  for (const k in fx) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt);
  const astDt = fx.slow > 0 ? dt * SLOW_FACTOR : dt;
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(astDt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  // Recoger power-up
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      collectPowerUp(p);
    }
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        for (const d of pendingDrops) {
          if (--d.kills === 0)
            powerups.push(new PowerUp(a.x + rand(-20, 20), a.y + rand(-20, 20), d.type));
        }
        pendingDrops = pendingDrops.filter(d => d.kills > 0);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (fx.shield > 0) {
          // El escudo absorbe el golpe y da 1 s de gracia para alejarse
          fx.shield = 0;
          ship.invincible = 1;
          explode(ship.x, ship.y, 10);
          sfxShield();
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Barras de efectos activos: una fila por efecto, con su color
  const BAR_W = 90;
  let row = 0;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  for (const k in fx) {
    if (fx[k] <= 0) continue;
    const { label, color, duration } = POWERUP_TYPES[k];
    const y = 46 + row++ * 18;
    // Parpadeo en el último segundo para avisar que expira
    if (fx[k] < 1 && Math.floor(fx[k] * 6) % 2 === 0) continue;
    ctx.fillStyle = color;
    ctx.fillText(label, 14, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(70.5, y - 9.5, BAR_W, 10);
    ctx.fillRect(72, y - 8, (BAR_W - 3) * (fx[k] / duration), 7);
  }

  if (novaStock > 0) {
    ctx.fillStyle = POWERUP_TYPES.nova.color;
    ctx.font = '14px monospace';
    ctx.fillText('NOVA x1  [B]', 14, H - 14);
  }
}

function drawEffects() {
  // Escudo alrededor de la nave (parpadea en el último segundo)
  if (fx.shield > 0 && !ship.dead && (fx.shield >= 1 || Math.floor(fx.shield * 6) % 2)) {
    ctx.strokeStyle = POWERUP_TYPES.shield.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now() / 120);
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (banner) {
    ctx.globalAlpha = Math.min(1, banner.ttl / 0.4);
    ctx.fillStyle = banner.color;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(banner.text, W / 2, H / 2 - 90);
    ctx.globalAlpha = 1;
  }

  if (novaFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(novaFlash / 0.35).toFixed(2)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawEffects();
  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
