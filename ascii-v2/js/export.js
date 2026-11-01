// Baixar e copiar. A imagem sai direto do canvas (sem html2canvas).

import { renderGrid, pickScale, CELL_W, CELL_H } from './render.js';
import { gridToText } from './grid.js';

const PAD = 16;
const IMAGE_TYPES = {
  png: ['image/png', 'png'],
  jpeg: ['image/jpeg', 'jpg'],
  webp: ['image/webp', 'webp'],
};

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toBlob(canvas, type) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), type, 0.95),
  );
}

/** Renderiza a grade em um canvas separado, em alta resolução, com margem. */
function exportCanvas(grid) {
  const canvas = document.createElement('canvas');
  const w = grid.cols * CELL_W + PAD * 2;
  const h = grid.rows * CELL_H + PAD * 2;
  renderGrid(canvas, grid, { scale: pickScale(w, h, 2), pad: PAD });
  return canvas;
}

export async function downloadGrid(grid, format) {
  if (format === 'txt') {
    save(new Blob([gridToText(grid)], { type: 'text/plain;charset=utf-8' }), 'ascii-art.txt');
    return;
  }
  const [type, ext] = IMAGE_TYPES[format] || IMAGE_TYPES.png;
  save(await toBlob(exportCanvas(grid), type), `ascii-art.${ext}`);
}

/** @returns 'texto' | 'imagem' (o que foi copiado) */
export async function copyGrid(grid, format) {
  if (format === 'txt') {
    const text = gridToText(grid);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) throw new Error('Não foi possível copiar');
    }
    return 'texto';
  }
  // A área de transferência só aceita PNG de forma confiável.
  const blob = await toBlob(exportCanvas(grid), 'image/png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  return 'imagem';
}
