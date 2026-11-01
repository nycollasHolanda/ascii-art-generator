// Desenha uma grade em um <canvas>.
//
// Por que é rápido: em vez de 1 elemento DOM por caractere, é UM canvas.
// No modo colorido, os caracteres são agrupados por cor (4 bits por canal,
// no máximo 4096 cores) e o fillStyle é trocado uma vez por grupo.

export const CELL_W = 6;
export const CELL_H = 12;
export const CELL_ASPECT = CELL_W / CELL_H; // usado para não esticar a imagem

const FONT = '10px "Courier New", ui-monospace, Menlo, Consolas, monospace';
const BG = '#141416';
const FG = '#e6e6e6';

/** Escolhe a escala (nitidez) sem estourar o limite de pixels do canvas. */
export function pickScale(width, height, wanted = 1, maxPixels = 16e6) {
  return Math.max(1, Math.min(wanted, Math.sqrt(maxPixels / (width * height))));
}

const quant = (v) => Math.min(15, (v + 8) >> 4);

export function renderGrid(canvas, grid, { scale = 1, pad = 0 } = {}) {
  const { cols, rows, idx, chars, colors } = grid;
  const w = cols * CELL_W + pad * 2;
  const h = rows * CELL_H + pad * 2;

  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = grid.bg || BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(scale, 0, 0, scale, pad * scale, pad * scale);
  ctx.font = FONT;
  ctx.textAlign = 'center'; // centraliza cada glifo na sua célula
  ctx.textBaseline = 'middle';

  // Caracteres invisíveis não precisam ser desenhados.
  const blank = chars.map((c) => /^[\s⠀]*$/.test(c));
  const put = (i) =>
    ctx.fillText(chars[idx[i]], ((i % cols) + 0.5) * CELL_W, (Math.floor(i / cols) + 0.5) * CELL_H);

  const total = cols * rows;

  if (!colors) {
    ctx.fillStyle = FG;
    for (let i = 0; i < total; i++) if (!blank[idx[i]]) put(i);
    return;
  }

  const groups = new Map();
  for (let i = 0; i < total; i++) {
    if (blank[idx[i]]) continue;
    const key = (quant(colors[i * 3]) << 8) | (quant(colors[i * 3 + 1]) << 4) | quant(colors[i * 3 + 2]);
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(i);
  }
  for (const [key, list] of groups) {
    ctx.fillStyle = `rgb(${(key >> 8) * 17},${((key >> 4) & 15) * 17},${(key & 15) * 17})`;
    for (const i of list) put(i);
  }
}
