// Conjuntos de caracteres.
// REGRA ÚNICA: todos vão do caractere MAIS DENSO ao MAIS LEVE.
// Pixels claros recebem os caracteres densos (texto claro sobre fundo escuro).

// Braille: lista original (do mais leve ao mais denso), invertida abaixo.
const BRAILLE_LIGHT_TO_DENSE =
  '⠀⠁⠂⠄⠈⠐⠠⡀⠃⠆⠒⠤⠰⡄⡆⡇⡈⡐⡘⡤⡨⡸⡺⣀⣂⣄⣆⣈⣐⣔⣖⣘⣠⣤⣦⣨⣬⣾⣿';

export const CHARSETS = {
  classic: { label: 'Clássico', chars: Array.from('@%#*+=-:. ') },
  shades: { label: 'Tons', chars: Array.from('210&$#@%?=+*!:· ') },
  braille: { label: 'Braille (Unicode)', chars: Array.from(BRAILLE_LIGHT_TO_DENSE).reverse() },
};

export const MATRIX_CHARS = ['*', '1', '0'];
export const MAX_CUSTOM_CHARS = 100;

/** Converte o texto digitado em lista de caracteres (suporta emoji). */
export function parseCustom(text) {
  const list = Array.from(text).slice(0, MAX_CUSTOM_CHARS);
  return list.length ? list : [' '];
}
