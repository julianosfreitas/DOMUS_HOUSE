# Monografia DOMUS — template LaTeX (completo)

Template do TCC do **DOMUS** no formato institucional da **Faculdade Nova Roma**
(classe `extarticle` + timbre), com toda a estrutura ABNT e os capítulos já
esqueletados e semeados com o conteúdo real do projeto.

> Este template é **separado** de `../latex-template/` (que contém o TCC de outro
> aluno, usado só como referência de formato). Não misture os dois.

## Estrutura

```
latex-domus/
├── main.tex                 # documento mestre (preâmbulo, timbre, ordem)
├── sections/
│   ├── capa.tex             # pré-textuais
│   ├── folha-rosto.tex
│   ├── folha-aprovacao.tex
│   ├── resumo.tex           # resumo pt-BR + palavras-chave
│   ├── abstract.tex         # abstract en + keywords
│   ├── siglas.tex           # lista de abreviaturas e siglas
│   ├── 01-introducao.tex    # textuais (1 a 7)
│   ├── 02-fundamentacao.tex
│   ├── 03-trabalhos-relacionados.tex
│   ├── 04-materiais-metodos.tex
│   ├── 05-desenvolvimento.tex
│   ├── 06-resultados.tex
│   ├── 07-consideracoes.tex
│   ├── referencias.tex      # pós-textuais (ABNT, lista manual)
│   └── apendices.tex        # SUS, corpus de voz, BOM, repositório
├── figures/                 # figuras (PNG/PDF) — troque os placeholders
└── timbre/                  # papel timbrado institucional (logo + fundo)
```

## Como compilar

Precisa de uma distribuição TeX (TeX Live full ou MiKTeX). Desta pasta, rode
**duas vezes** (a 2ª resolve sumário, listas e referências):

```bash
pdflatex main.tex
pdflatex main.tex
# ou, em uma etapa:
latexmk -pdf main.tex
```

Não há `pdflatex` neste ambiente de desenvolvimento — compile na sua máquina
(MiKTeX instala os pacotes ausentes no 1º build) ou no **Overleaf** (suba a pasta
inteira; defina `main.tex` como documento principal).

## O que preencher (marcadores «...»)

- `main.tex`: `\tccautor`, `\tccorientador`, `\tcccoorientador` (e escolha o
  `\tcctitulo` — há uma alternativa mais conservadora comentada).
- `folha-aprovacao.tex`: nomes da banca.
- Capítulos: trechos marcados com «...» e comentários `%` indicam onde entram
  dados a coletar (WER, SUS, BOM, série de energia).
- `figures/`: substitua os placeholders (ex.: `fig_arquitetura.pdf`,
  `fig_latencia.pdf`).
- `referencias.tex`: complete datas de acesso «dia mês ano» e acrescente
  referências novas **em ordem alfabética**; cite no texto por autor-data.

## Convenções

- Citações: autor-data ABNT, restritas ao conjunto de `referencias.tex`.
- Rótulos de capítulo: `\label{cap:intro}`, `cap:fundamentacao`, `cap:relacionados`,
  `cap:metodos`, `cap:desenvolvimento`, `cap:resultados`, `cap:consideracoes`.
- Tabelas com `booktabs`; figuras com `[H]` e `\label{fig:...}`.
- Resultados: separe o que está **confirmado** (Tapo/KLAP, acurácia de intenção)
  do que é **«a coletar»** (WER, SUS, BOM, energia) — não infle números.
