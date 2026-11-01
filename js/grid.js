// Transforma dados (pixels de imagem ou valores de padrões) em uma "grade":
//
//   { cols, rows,
//     idx:    Uint8Array  -> índice do caractere de cada célula (em `chars`)
//     chars:  string[]    -> caracteres usados
//     colors: Uint8Array | null -> RGB por célula (null = monocromático)
//     bg:     string | null     -> fundo especial (modo Matrix) }
//
// A grade é só um punhado de arrays tipados: nada de DOM, nada de string HTML.
// O desenho fica em render.js e o texto puro em gridToText().

import { MATRIX_CHARS } from './charsets.js';

/* ---------- utilidades de cor ---------- */

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Cria o array de cores conforme o modo escolhido. */
function makeColors(mode, lum, cols, rows, rgb) {
  if (mode === 'mono') return null;
  if (mode === 'color' && rgb) return rgb; // cores reais da imagem

  const n = cols * rows;
  const out = new Uint8Array(n * 3);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const v = lum[i];
      let c;
      if (mode === 'rainbow') {
        c = hslToRgb(((x / cols + y / rows) / 2) * 360, 1, 0.5); // diagonal
      } else if (mode === 'matrix') {
        c = [0, Math.round(45 + v * 210), 0];
      } else {
        // 'color' em padrões: matiz depende do valor
        c = hslToRgb(v * 360, (80 + v * 20) / 100, (30 + v * 40) / 100);
      }
      out[i * 3] = c[0];
      out[i * 3 + 1] = c[1];
      out[i * 3 + 2] = c[2];
    }
  }
  return out;
}

/* ---------- núcleo ---------- */

function finish(lum, cols, rows, o, rgb) {
  const chars = o.color === 'matrix' ? MATRIX_CHARS : o.chars;
  const n = cols * rows;
  const last = chars.length - 1;
  const idx = new Uint8Array(n);

  // brilho 1 (claro) -> índice 0 (caractere mais denso)
  for (let i = 0; i < n; i++) {
    idx[i] = Math.min(last, Math.floor((1 - lum[i]) * chars.length));
  }

  if (o.outline) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const l = lum[i];
        const right = x < cols - 1 ? lum[i + 1] : l;
        const down = y < rows - 1 ? lum[i + cols] : l;
        if (Math.abs(l - right) + Math.abs(l - down) > 0.3) idx[i] = 0;
      }
    }
  }

  return {
    cols,
    rows,
    idx,
    chars,
    colors: makeColors(o.color, lum, cols, rows, rgb),
    bg: o.color === 'matrix' ? '#000' : null,
  };
}

/**
 * @param sample {cols, rows, rgba} vindo de image.js
 * @param o { chars, color, invert, flipH, flipV, outline }
 */
export function gridFromImage(sample, o) {
  const { cols, rows, rgba } = sample;
  const n = cols * rows;
  const lum = new Float32Array(n);
  const rgb = o.color === 'color' ? new Uint8Array(n * 3) : null;

  for (let y = 0; y < rows; y++) {
    const sy = o.flipV ? rows - 1 - y : y;
    for (let x = 0; x < cols; x++) {
      const sx = o.flipH ? cols - 1 - x : x;
      const s = (sy * cols + sx) * 4;
      let r = rgba[s];
      let g = rgba[s + 1];
      let b = rgba[s + 2];
      if (o.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }
      const i = y * cols + x;
      lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (rgb) {
        rgb[i * 3] = r;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = b;
      }
    }
  }
  return finish(lum, cols, rows, o, rgb);
}

/** values: Float32Array com valores 0..1 (gerados em patterns.js) */
export function gridFromValues(values, cols, rows, o) {
  const lum = new Float32Array(cols * rows);
  for (let i = 0; i < lum.length; i++) {
    const v = Math.max(0, Math.min(1, values[i] || 0));
    lum[i] = o.invert ? 1 - v : v;
  }
  return finish(lum, cols, rows, o, null);
}

/** Texto puro (para copiar / exportar .txt). Sem cores. */
export function gridToText({ cols, rows, idx, chars }) {
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) line += chars[idx[y * cols + x]];
    lines.push(line);
  }
  return lines.join('\n');
}
