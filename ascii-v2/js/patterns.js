// Padrões criativos. Cada gerador devolve um Float32Array (cols*rows) com valores 0..1.
// As coordenadas levam em conta que a célula do caractere é mais alta que larga,
// então círculos saem redondos e fractais não ficam esticados.

import { CELL_W, CELL_H } from './render.js';

/* ---------- Perlin noise (com semente) ---------- */

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);
function grad(hash, x, y) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

class Perlin {
  constructor(seed) {
    const rnd = mulberry32(seed);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }

  noise(x, y) {
    const p = this.p;
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const a = p[X] + Y;
    const b = p[X + 1] + Y;
    return lerp(
      lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
      lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
      v,
    );
  }
}

let perlin = new Perlin(1);
export function reseedNoise() {
  perlin = new Perlin((Math.random() * 1e9) | 0);
}

/* ---------- helpers ---------- */

/** Preenche o campo chamando fn(nx, ny, px, py). nx/ny: -1..1 (quadrado); px/py: pixels. */
function field(cols, rows, fn) {
  const out = new Float32Array(cols * rows);
  const pw = cols * CELL_W;
  const ph = rows * CELL_H;
  const half = Math.min(pw, ph) / 2;
  for (let y = 0; y < rows; y++) {
    const py = (y + 0.5) * CELL_H;
    for (let x = 0; x < cols; x++) {
      const px = (x + 0.5) * CELL_W;
      out[y * cols + x] = fn((px - pw / 2) / half, (py - ph / 2) / half, px, py);
    }
  }
  return out;
}

function normalize(arr) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of arr) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  for (let i = 0; i < arr.length; i++) arr[i] = span > 1e-9 ? (arr[i] - min) / span : 0.5;
  return arr;
}

const mod1 = (v) => ((v % 1) + 1) % 1;

/* ---------- fractais ---------- */

function escapeTime(zx, zy, cx, cy, max, ship) {
  let i = 0;
  while (zx * zx + zy * zy <= 4 && i < max) {
    const t = zx * zx - zy * zy + cx;
    zy = (ship ? Math.abs(2 * zx * zy) : 2 * zx * zy) + cy;
    zx = ship ? Math.abs(t) : t;
    i++;
  }
  return Math.sqrt(i / max); // raiz: realça os tons médios
}

function fractal(s, cols, rows) {
  const max = s.iterations;
  if (s.fractalType === 'julia') {
    return field(cols, rows, (nx, ny) => escapeTime(nx * 1.6, ny * 1.6, s.juliaRe, s.juliaIm, max, false));
  }
  if (s.fractalType === 'burning-ship') {
    return field(cols, rows, (nx, ny) => escapeTime(0, 0, nx * 1.6 - 0.5, ny * 1.6 - 0.5, max, true));
  }
  return field(cols, rows, (nx, ny) => escapeTime(0, 0, nx * 1.5 - 0.5, ny * 1.5, max, false));
}

/* ---------- ruído ---------- */

function noise(s, cols, rows) {
  const scale = s.noiseScale / 2500; // unidades de ruído por pixel
  const values = field(cols, rows, (_nx, _ny, px, py) => {
    let v = 0;
    let amp = 1;
    let freq = 1;
    for (let o = 0; o < s.octaves; o++) {
      v += perlin.noise(px * scale * freq, py * scale * freq) * amp;
      amp *= 0.5;
      freq *= 2;
    }
    return v;
  });
  return normalize(values);
}

/* ---------- ondas ---------- */

function waves(s, cols, rows) {
  const f = s.frequency / 10;
  const amp = s.amplitude / 100;
  const TAU = Math.PI * 2;
  return field(cols, rows, (nx, ny) => {
    const d = Math.hypot(nx, ny) * 2;
    let v;
    switch (s.waveType) {
      case 'cosine':
        v = Math.cos(d * f * TAU);
        break;
      case 'tangent':
        v = Math.tan((d * f * Math.PI) % (Math.PI / 2 - 0.1)) * 0.2;
        break;
      case 'complex':
        v = Math.sin(d * f * Math.PI) * 0.7 + Math.cos(d * f * Math.PI * 2.3) * 0.3;
        break;
      default:
        v = Math.sin(d * f * TAU);
    }
    return (v * amp + 1) / 2;
  });
}

/* ---------- espirais ---------- */

function spiral(s, cols, rows) {
  const density = s.density / 10;
  const rot = (s.rotation * Math.PI) / 180;
  return field(cols, rows, (nx, ny) => {
    const dist = Math.hypot(nx, ny) / 1.4;
    const turn = (Math.atan2(ny, nx) + rot) / (2 * Math.PI);
    switch (s.spiralType) {
      case 'logarithmic':
        return mod1(Math.log(dist * density + 0.001) + turn);
      case 'hyperbolic':
        return mod1(1 / (dist * density + 0.1) + turn);
      default:
        return mod1(turn + dist * density);
    }
  });
}

/* ---------- radiais ---------- */

function radial(s, cols, rows) {
  return field(cols, rows, (nx, ny) => {
    const d = Math.hypot(nx, ny);
    const a = Math.atan2(ny, nx);
    let v;
    switch (s.radialType) {
      case 'geometric':
        v = Math.max(0, Math.sin(d * 15) * Math.cos(a * 8));
        break;
      case 'organic':
        v = (Math.sin(d * 10) + Math.cos(a * 5)) / 2;
        break;
      default:
        v = Math.sin(d * 10) * Math.cos(a * 5) * Math.sin(d * 20);
    }
    return (v + 1) / 2;
  });
}

/* ---------- entrada única ---------- */

const GENERATORS = { fractal, noise, waves, spiral, radial };

export function generatePattern(state, cols, rows) {
  return (GENERATORS[state.patternType] || fractal)(state, cols, rows);
}
