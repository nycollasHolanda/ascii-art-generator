// Ponto de entrada: liga a interface ao pipeline
//   imagem/padrão  ->  grade (grid.js)  ->  canvas (render.js)  ->  exportar (export.js)
//
// Como a interface funciona:
//  - todo controle com  data-key="nome"  vira state.nome automaticamente
//  - data-tab-panel="image|pattern"  mostra o bloco só naquela aba
//  - data-when="chave=valor"         mostra o bloco só quando state.chave == valor
//  - <output data-out="nome">        exibe o valor atual de state.nome

import { CHARSETS, parseCustom } from './charsets.js';
import { loadImage, sampleImage } from './image.js';
import { gridFromImage, gridFromValues } from './grid.js';
import { generatePattern, reseedNoise } from './patterns.js';
import { renderGrid, pickScale, CELL_W, CELL_H, CELL_ASPECT } from './render.js';
import { downloadGrid, copyGrid } from './export.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const canvas = $('#art');
const dropzone = $('#dropzone');
const viewport = $('#viewport');
const fileInput = $('#file');
const btnDownload = $('#btn-download');
const btnCopy = $('#btn-copy');
const formatSelect = $('#export-format');
const toastEl = $('#toast');

/* ---------- estado ---------- */

const readEl = (el) =>
  el.type === 'checkbox' ? el.checked : el.type === 'range' || el.type === 'number' ? Number(el.value) : el.value;

const state = { tab: 'image' };
$$('[data-key]').forEach((el) => (state[el.dataset.key] = readEl(el))); // valores iniciais vêm do HTML

let image = null; // HTMLImageElement
let sample = null; // pixels reduzidos (cacheado enquanto a largura não muda)
let grid = null; // última grade renderizada

/* ---------- utilidades de UI ---------- */

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function syncUI() {
  $$('[data-tab-panel]').forEach((el) => (el.hidden = el.dataset.tabPanel !== state.tab));
  $$('[data-when]').forEach((el) => {
    const [key, value] = el.dataset.when.split('=');
    el.hidden = String(state[key]) !== value;
  });
  $$('[data-out]').forEach((el) => (el.textContent = state[el.dataset.out]));
  $$('.tab').forEach((el) => {
    const active = el.dataset.tab === state.tab;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-pressed', String(active));
  });
}

/* ---------- pipeline ---------- */

function styleOptions() {
  return {
    chars: state.charset === 'custom' ? parseCustom(state.customChars) : CHARSETS[state.charset].chars,
    color: state.color,
    invert: state.invert,
    flipH: state.flipH,
    flipV: state.flipV,
    outline: state.outline,
  };
}

function update() {
  syncUI();

  if (state.tab === 'image') {
    if (!image) {
      grid = null;
    } else {
      if (!sample || sample.cols !== state.cols) sample = sampleImage(image, state.cols, CELL_ASPECT);
      grid = gridFromImage(sample, styleOptions());
    }
  } else {
    const values = generatePattern(state, state.cols, state.rows);
    grid = gridFromValues(values, state.cols, state.rows, styleOptions());
  }

  const showCanvas = grid !== null;
  canvas.hidden = !showCanvas;
  dropzone.hidden = showCanvas;
  btnDownload.disabled = btnCopy.disabled = !showCanvas;
  if (!showCanvas) return;

  const cssW = grid.cols * CELL_W;
  const cssH = grid.rows * CELL_H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderGrid(canvas, grid, { scale: pickScale(cssW, cssH, dpr, 12e6) });
  canvas.style.width = `${cssW}px`; // o CSS limita a 100% do container
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(update); // vários eventos seguidos = 1 render
}

/* ---------- eventos ---------- */

$('#controls').addEventListener('input', (e) => {
  const el = e.target.closest('[data-key]');
  if (!el) return;
  state[el.dataset.key] = readEl(el);
  schedule();
});

$$('.tab').forEach((btn) =>
  btn.addEventListener('click', () => {
    state.tab = btn.dataset.tab;
    schedule();
  }),
);

async function openFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    toast('Escolha um arquivo de imagem.');
    return;
  }
  try {
    image = await loadImage(file);
    sample = null;
    state.tab = 'image';
    schedule();
  } catch {
    toast('Não foi possível abrir essa imagem.');
  }
}

fileInput.addEventListener('change', () => {
  openFile(fileInput.files[0]);
  fileInput.value = ''; // permite escolher o mesmo arquivo de novo
});
$('#btn-pick').addEventListener('click', () => fileInput.click());

['dragenter', 'dragover'].forEach((type) =>
  viewport.addEventListener(type, (e) => {
    e.preventDefault();
    viewport.classList.add('is-drag');
  }),
);
['dragleave', 'drop'].forEach((type) =>
  viewport.addEventListener(type, (e) => {
    e.preventDefault();
    viewport.classList.remove('is-drag');
  }),
);
viewport.addEventListener('drop', (e) => openFile(e.dataTransfer.files[0]));

$('#btn-seed').addEventListener('click', () => {
  reseedNoise();
  schedule();
});

btnDownload.addEventListener('click', async () => {
  if (!grid) return;
  try {
    await downloadGrid(grid, formatSelect.value);
  } catch {
    toast('Não foi possível gerar o arquivo.');
  }
});

btnCopy.addEventListener('click', async () => {
  if (!grid) return;
  try {
    toast(`${await copyGrid(grid, formatSelect.value)} copiado!`.replace(/^./, (c) => c.toUpperCase()));
  } catch {
    toast('Não foi possível copiar.');
  }
});

update();
