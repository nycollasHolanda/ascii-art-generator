# ASCII Art Generator v2

Conversor de imagem para arte ASCII em HTML, CSS e JavaScript puro. Sem build e sem dependências.

## Como rodar

Os arquivos JS usam módulos ES (`import`), que não funcionam abrindo o HTML direto (`file://`).
Use qualquer servidor local:

```bash
python3 -m http.server 8000   # ou: npx serve
# abra http://localhost:8000
```

## Estrutura

```
index.html              página do conversor
howToUse/como-usar.html guia de uso (mesmo caminho da v1)
css/styles.css          todo o estilo (variáveis no :root)
js/
  main.js      liga a interface ao pipeline (estado, eventos, abas)
  charsets.js  conjuntos de caracteres (sempre do mais denso ao mais leve)
  image.js     carrega a imagem e reduz para uma grade de pixels
  grid.js      pixels/valores -> grade (índice do caractere + cor); aplica efeitos
  patterns.js  fractais, ruído, ondas, espirais, radial
  render.js    grade -> <canvas> (agrupa caracteres por cor)
  export.js    baixar / copiar (PNG, JPEG, WebP, TXT)
```

Fluxo: `imagem ou padrão -> grade -> canvas -> exportar`.

## Como mexer

- **Novo conjunto de caracteres:** adicione em `charsets.js` e uma `<option>` no `index.html`
  (select `data-key="charset"`).
- **Novo efeito:** leia as opções em `styleOptions()` (`main.js`) e aplique em `gridFromImage` (`grid.js`).
  Para criar o controle, adicione `<input data-key="meuEfeito">` no HTML e ele já aparece em `state.meuEfeito`.
- **Novo padrão criativo:** crie a função em `patterns.js`, registre em `GENERATORS`
  e adicione a opção e os controles no HTML (`data-when="patternType=meuPadrao"`).
- **Tamanho/proporção do caractere:** `CELL_W` / `CELL_H` em `render.js`.

## Convenções da interface

- Todo controle com `data-key="nome"` vira `state.nome` automaticamente.
- `data-tab-panel="image|pattern"` mostra o bloco só naquela aba.
- `data-when="chave=valor"` mostra o bloco só quando `state.chave == valor`.
- `<output data-out="nome">` exibe o valor atual de `state.nome`.
