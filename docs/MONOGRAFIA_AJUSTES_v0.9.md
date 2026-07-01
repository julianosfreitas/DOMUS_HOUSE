# Ajustes para a monografia — CASAI → DOMUS (v0.8 → v0.9)

> **O que entregar agora.** Este documento lista, de forma acionável, o que mudar em
> `CASAI_TCC_Monografia_v0.8.docx` para refletir (1) a **renomeação do sistema para
> DOMUS**, (2) a **nova identidade visual** e (3) a decisão de **usar apenas
> dispositivos físicos** (sem simulados na demonstração). Aplicar no `.docx` e salvar
> como `DOMUS_TCC_Monografia_v0.9.docx`.
>
> Referência viva do texto: [`MONOGRAFIA_ESBOCO.md`](MONOGRAFIA_ESBOCO.md) (já atualizado).

---

## A. Renomeação CASAI → DOMUS (nome do sistema)

Substituir **CASAI → DOMUS** em todo o corpo do texto **quando for o nome do sistema**:
capa, folha de rosto, título, resumo/abstract, palavras-chave, cabeçalhos de capítulo
(ex.: *"5 DESENVOLVIMENTO DO DOMUS"*), quadros comparativos (Quadro 1 e 2) e legendas.

**Título novo:** *DOMUS: uma arquitetura local-first e de baixo custo para a
democratização da automação residencial no Brasil.*

**NÃO trocar (técnico/externo — manter como está):**
- URL do repositório: `github.com/julianosfreitas/casai_tcc`.
- Nome do arquivo-fonte citado historicamente, se houver.
- Identificadores internos de código citados no texto (ex.: variáveis, chaves), caso
  apareçam — são infraestrutura, não a marca.

> Dica no Word: *Substituir Tudo* `CASAI`→`DOMUS`, depois **revisar manualmente** as
> ocorrências dentro de URLs e nomes de arquivo e revertê-las.

---

## B. Identidade visual (nova subseção + capa)

Inserir a marca na **capa** e uma breve **subseção de identidade** (sugerido em §5.1 ou
apêndice). Elementos entregues (em `apps/web/public/brand/` e `docs/src/`):

- **Nome — DOMUS**: do latim *domus* ("casa/lar"); conecta a proposta (a casa) a uma
  identidade clássica, coerente com a **Faculdade Nova Roma**.
- **Emblema (logo)** — `domus-emblem.png`: um **tucano** (fauna brasileira) em moldura
  dourada clássica; símbolo local + acabamento erudito.
- **Logotipo** — `domus-logo.png`: emblema + palavra **DOMUS**; o "O" evoca o
  *impluvium* (o tanque central da domus romana que **captava a água da chuva**) —
  metáfora direta do princípio "captar o recurso uma vez e guardá-lo em casa".
- **Slogan** — *"A nuvem, uma vez. A casa, para sempre."* — reformulação do princípio
  operacional **"nuvem uma vez, local para sempre"** (§Tese, §5.4).
- **Paleta** — institucional alinhada à Nova Roma (marinho + ouro), aplicada a
  logotipo/ícones/PWA (favicon incluso). *Obs.: a paleta do app em si permaneceu
  neutra; a identidade DOMUS aparece na marca, no login e nos ícones.*

Texto sugerido para a subseção (colar e ajustar):
> *O sistema recebe o nome **DOMUS** (latim, "casa"). O emblema — um tucano em moldura
> clássica — associa a fauna brasileira a uma estética erudita alinhada à Faculdade
> Nova Roma. O logotipo estiliza o "O" como o **impluvium** da domus romana, o tanque
> que captava a água da chuva: a mesma lógica do princípio operacional do projeto —
> "**A nuvem, uma vez. A casa, para sempre**".*

---

## C. Dispositivos: apenas físicos (sem simulados na demonstração)

Decisão desta entrega: **a casa da demonstração contém somente os dois aparelhos
físicos** — lâmpada **Intelbras/Tuya EWS 410** e tomada **TP-Link Tapo P110**. O
adaptador **MOCK** deixou de ser um dispositivo da casa e permanece **apenas como
recurso de desenvolvimento e testes automatizados (CI)**.

Onde ajustar no texto:
- **§5.2 (Adapter):** ao listar adaptadores, deixar claro que a **simulação (MOCK) é
  só de desenvolvimento/CI**, não um dispositivo da demonstração. *(Já refletido no
  esboço.)*
- **§5.7 (Implantação):** rever a frase "demo pública em modo simulado". Sem mocks, a
  demo pública mostra **interface + fluxo de voz**, mas o **controle real dos aparelhos
  só ocorre na instalação local** (mesma LAN). *(Já refletido no esboço.)*
- **§5.5 / cenas e rotinas:** as rotinas e cenas de exemplo foram **repontadas para os
  aparelhos físicos** (ex.: "Boa noite" desliga a lâmpada Tuya e a tomada Tapo). Se o
  texto cita nomes de dispositivos simulados ("Luz da Sala", "Cafeteira"), atualizar
  para os físicos.
- **§6 (Resultados) e Quadros:** manter os resultados de hardware (Tapo 201–332 ms;
  Tuya nuvem 8/8); nenhum resultado dependia de MOCK.

---

## D. Funcionalidades novas desde a v0.8 (incluir em §5 e/ou §6)

Incorporar ao capítulo de Desenvolvimento/Resultados:
- **Assistente de voz mãos-livres**: a tela de voz **escuta ao abrir**, detecta o
  **fim da fala** (VAD — *voice activity detection*) e **executa sozinha**, sem botão;
  retorno por **animação na própria tela** (sem pop-ups), com contraste por tema.
- **Feedback sonoro (earcons)**: sons curtos ao **entrar**, ao **executar com sucesso**
  e ao **falhar** — reforço multimodal (útil para acessibilidade), com destravamento no
  primeiro toque para funcionar em navegadores móveis.
- **Apelido de voz por dispositivo**: o usuário define um nome curto pelo qual o
  assistente reconhece o aparelho (reforça o parser tolerante a variações).
- **Menu de conta** unificado (fala, motor de voz, tema, sair) e **rotas em português**
  (/voz, /inicio, /dispositivos, /rotinas, /conquistas) — PWA instalável.
- **Parser de intenção** com correspondência aproximada (Damerau–Levenshtein) +
  correlação por tipo e apelido (estilo assistentes comerciais).

---

## E. Pontos que exigem sua decisão (marcados para a banca)

1. **Demo pública sem simulados.** Com a remoção dos mocks, a demonstração pública não
   controla aparelhos (o servidor não alcança a LAN; a lâmpada Tuya ainda não está
   provisionada; a tomada Tapo depende de estar na mesma rede). *Opções:* (a) manter
   assim e demonstrar o **controle real ao vivo na instalação local**; (b) reintroduzir
   **um** dispositivo simulado só para a demo pública (contraria "apenas físicos"). —
   **Recomendado (a)**, pois a defesa com hardware real é mais forte.
2. **Slide/figura "comando de voz executado".** Antes usava um dispositivo simulado;
   agora depende de aparelho físico alcançável. Regerar a figura na **instalação local**
   com a tomada Tapo respondendo.
3. **Lâmpada Tuya EWS 410** segue **não provisionada** (limitação já registrada em §7.1);
   permanece como trabalho em curso.

---

## F. Checklist de substituição no `.docx`

- [ ] Capa/folha de rosto: título e nome do sistema → **DOMUS**; inserir logotipo.
- [ ] Resumo/Abstract + palavras-chave: CASAI → DOMUS.
- [ ] Cabeçalhos de capítulo e quadros (1 e 2): CASAI → DOMUS.
- [ ] Nova subseção de identidade visual (texto da seção B).
- [ ] §5.2, §5.5, §5.7: ajustes de "apenas físicos / MOCK só em testes" (seção C).
- [ ] §5–§6: parágrafos das funcionalidades novas (seção D).
- [ ] Preservar `github.com/julianosfreitas/casai_tcc` e nomes técnicos.
- [ ] Salvar como `DOMUS_TCC_Monografia_v0.9.docx`.
