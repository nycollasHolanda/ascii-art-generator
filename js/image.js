// Carrega a imagem e reduz para uma grade de (cols x rows) pixels.
// Cada pixel dessa grade vira exatamente um caractere.

const work = document.createElement('canvas');
const wctx = work.getContext('2d', { willReadFrequently: true });

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

/**
 * @param cellAspect largura/altura de uma célula de caractere (corrige o "esticado")
 * @returns {{cols:number, rows:number, rgba:Uint8ClampedArray}}
 */
export function sampleImage(img, cols, cellAspect) {
  const rows = Math.max(1, Math.round(cols * (img.naturalHeight / img.naturalWidth) * cellAspect));
  work.width = cols;
  work.height = rows;
  // Transparência vira fundo preto (mesmo fundo do resultado).
  wctx.fillStyle = '#000';
  wctx.fillRect(0, 0, cols, rows);
  wctx.imageSmoothingEnabled = true;
  wctx.imageSmoothingQuality = 'high';
  wctx.drawImage(img, 0, 0, cols, rows);
  return { cols, rows, rgba: wctx.getImageData(0, 0, cols, rows).data };
}
