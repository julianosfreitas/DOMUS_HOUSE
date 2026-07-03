# Estrutura de slides — Defesa DOMUS (para IA de criação de slides)

> Cole este arquivo inteiro na IA de slides (Gamma, Beautiful.ai, Tome, Copilot etc.).
> São **13 slides**, 16:9, para defesa de TCC. Mantenha a identidade visual abaixo.

---

## INSTRUÇÕES DE IDENTIDADE (aplicar a todos os slides)

- **Instituição:** Faculdade Nova Roma — Curso de Ciência da Computação (Recife, 2026).
- **Autor:** Juliano Freitas · **Orientador:** Prof. MSc. Henning Summer.
- **Tom:** acadêmico, limpo, minimalista. Muito espaço em branco. Pouco texto por slide
  (título forte + 3–5 bullets curtos + 1 visual). Nada de parágrafos longos.
- **Fundo:** claro (branco / quase-branco). Texto principal quase-preto (#0A0A0A).
- **Paleta de acento (cores da logo — um tucano em losango):**
  - Verde folhagem `#2F6B45`
  - Dourado (bico) `#CF9A3A`
  - Azul (ponta do bico) `#2F5FA0`
  Use os acentos com parcimônia (títulos, destaques, ícones, barras de dado). Sem neon/glow.
- **Tipografia:** títulos em fonte **display condensada e imponente** (ideal: *Romario*;
  se indisponível, use **Oswald** ou **Archivo Narrow**); corpo em **sans-serif** limpa
  (Helvetica/Arial/Inter). Números sempre em `tabular-nums`.
- **Marca:** usar o **tucano (mascote TUCO)** e/ou o **emblema em losango** como elemento
  visual recorrente (canto/rodapé discreto). Rodapé: "DOMUS · TCC 2026 · Faculdade Nova Roma".
- **Regra de honestidade:** separar visualmente resultado **confirmado** de **a coletar**
  (não inflar números).
- **Regra de prova física:** usar **fotos reais** do hardware e do sistema rodando —
  **nunca** molduras 3D de iPhone, screenshots fake nem imagens de banco. Fundo neutro/escuro,
  bem iluminado. Materializa o software para a banca (mata a impressão de "projeto de Figma").

---

## SLIDE 1 — Capa
- **Título:** DOMUS
- **Subtítulo:** Uma arquitetura *local-first* de baixo custo para a democratização da
  automação residencial por voz em português
- Autor: Juliano Freitas · Orientador: Prof. MSc. Henning Summer
- Faculdade Nova Roma — Ciência da Computação · Recife, 2026
- **Visual:** tucano/emblema em destaque; fundo claro com leve aurora nas cores da logo.

## SLIDE 2 — O problema (a dor)
- **Título:** O hardware já é barato. A automação, não.
- Lâmpadas/tomadas Wi-Fi genéricas (Tuya) custam **R$ 30–60** — mas a casa inteligente
  segue inacessível ao domicílio típico.
- **Três barreiras encadeadas:**
  1. **Comissionamento** — app do fabricante, conta em nuvem, portais de dev em inglês.
  2. **Dependência de nuvem** — a casa "para" quando a internet cai.
  3. **Privacidade** — áudio/hábitos enviados a terceiros (tensiona a LGPD).
- **Dado:** penetração de **16,4%** dos domicílios no Brasil vs ~44% EUA/UK; só **22%**
  têm conectividade satisfatória (CETIC.br, 2024).
- **Visual:** 3 ícones (cadeado/engrenagem, nuvem cortada, olho) + mini-gráfico de barras BR×mundo.

## SLIDE 3 — Pergunta e hipótese
- **Pergunta:** é viável um sistema por voz pt-BR, *local-first*, com hardware barato,
  **comissionável por usuário não técnico** — sem app do fabricante e sem portal de dev?
- **Hipótese (falsificável):** a democratização depende **menos do preço do hardware** e
  **mais da redução da barreira de comissionamento**.
- **Princípio:** *"A nuvem, uma vez. A casa, para sempre."*
- **Visual:** frase-princípio grande, centralizada, em fonte display.

## SLIDE 4 — Objetivos
- **Geral:** demonstrar a viabilidade técnica de um hub *local-first*, barato, por voz pt-BR,
  com comissionamento que reduza a barreira de acesso.
- **Específicos:** (1) arquitetura que isole a fragmentação de protocolos; (2) voz pt-BR no
  hub, sem áudio à nuvem; (3) validar controle local de hardware real (latência/confiabilidade);
  (4) comissionamento sem app/portais; (5) protocolo de avaliação (custo, voz, energia, usabilidade).
- **Visual:** 1 objetivo geral no topo + 5 específicos numerados.

## SLIDE 5 — Fundamentação
- **Título:** Os conceitos por trás do DOMUS
- **Local-first:** plano de controle (voz, chaves, dados) existe e funciona **na instalação local**.
- **Comissionamento × controle:** o Home Assistant resolve o *controle*, mas pressupõe
  pareamento prévio pelo app do fabricante — o gargalo está **antes**.
- **Voz no hub:** *Whisper* transcreve localmente; o áudio **não sai** de casa (alinha à LGPD).
- **Padrão Adapter:** isola a heterogeneidade de protocolos (Tuya, Tapo, …).
- **Visual:** 4 blocos/ícones.

## SLIDE 6 — Trabalhos relacionados
- **Título:** Onde o DOMUS se posiciona
- **Tabela comparativa** (linhas: Home Assistant, Alexa/Google, Matter, **DOMUS**;
  colunas: controle local · comissionamento sem app/portal · voz pt-BR local · baixo custo).
- Destaque: **DOMUS** é a única linha marcada em comissionamento local **e** voz pt-BR no hub.
- **Visual:** tabela limpa, coluna DOMUS destacada com acento verde.

## SLIDE 7 — Arquitetura
- **Título:** Como o DOMUS é construído
- Hub **NestJS** (Node.js/TypeScript) + **PWA** Next.js instalável no celular.
- **Adapter pattern:** `TuyaAdapter`, `TapoAdapter`, `MockAdapter` — nenhum controller fala
  com a lib de IoT direto; modo MOCK roda sem hardware.
- **Segurança:** JWT; `local_key` cifrada em **AES-256-GCM**; escopo por usuário.
- **Visual:** diagrama de blocos (PWA → API/hub → adapters → dispositivos) **+ FOTO REAL do hub
  físico** (Raspberry Pi / mini-PC / plaquinha com cabos na mesa, fundo neutro, bem iluminado).
  Materializa o "core NestJS" — o código roda *dentro daquela caixinha*.

## SLIDE 8 — TUCO: a voz em português
- **Título:** TUCO — o assistente por voz
- Fala um comando → **Whisper no hub** transcreve → interpreta a intenção → executa; fila
  serializada por dispositivo; funciona **offline** (PWA).
- **Mascote TUCO** (tucano) com 4 estados: entrada, escutando, entendeu, cabisbaixo.
- **Visual:** **FOTO REAL** do celular com a PWA DOMUS rodando de verdade (na mesa, ao lado da
  lâmpada/hub, tela brilhando) — **sem** moldura 3D de iPhone. Ao lado, os **4 ícones puros do
  TUCO** (Ocioso · Ouvindo · Sucesso · Erro). Prova que o PWA está buildado e na palma da mão.

## SLIDE 9 — DOMUS em Ação (Demo)
- **Título:** DOMUS em Ação
- **Vídeo curto (30–45 s), gravado antes** — Lei de Murphy reina em IoT ao vivo; vídeo sem cortes
  vale mais que 100 páginas de monografia.
- **Roteiro:** (1) tira a internet (desconecta cabo do roteador / desliga Wi-Fi externo);
  (2) celular roda a PWA em **modo offline local**; (3) fala *"Tuco, ligar a luz"*;
  (4) mascote muda de estado na tela; (5) **a luz acende no fundo** — prova a baixa latência.
- **Visual:** frame do vídeo em destaque + botão play; badge "offline" visível. Um take único, liso.

## SLIDE 10 — Resultados
- **Título:** O que foi medido
- **Confirmado:**
  - Controle local **Tapo P110** via **KLAP** — latência **201–332 ms**.
  - Voz: acurácia de **intenção 87,7%** (138 comandos reais).
  - Execução ponta-a-ponta **66,7%** (dominada por hardware offline, **não** pelo parser).
  - Latência voz→ação: **p50 463 ms · p95 2140 ms** (outlier 12,3 s = timeout de hardware).
- **A coletar:** WER (corpus), SUS (usabilidade), BOM (custo), energia antes/depois.
- **Visual:** tabela/painel de métricas; badge "confirmado" (verde) × "a coletar" (cinza)
  **+ FOTO REAL do ambiente de testes**: tela do notebook com os logs do terminal (os
  milissegundos de resposta) desfocada ao fundo, **lâmpada acesa em primeiro plano**.
  Traz autoridade científica — os números (87,7% · 463 ms) ganham vida no "mão na massa".

## SLIDE 11 — A barreira, na prática
- **Título:** A lâmpada que não pareou — e por que isso importa
- A **Intelbras EWS 410 (Tuya)** não foi comissionada localmente (exige `local_key`/Device ID
  via portal; limite de slots da plataforma).
- **Reenquadramento:** o bloqueio é **evidência empírica** da barreira de comissionamento —
  ela é real a ponto de travar até o próprio autor.
- **Visual:** **FOTOS REAIS** dos dois dispositivos comprados, lado a lado — **Tuya** (lâmpada
  Intelbras EWS 410 que falhou, ⧗ em validação) × **Tapo** (tomada TP-Link P110 que funcionou,
  ✔ forma plena). Hardware físico exato cria empatia e prova empírica.

## SLIDE 12 — Limitações e trabalhos futuros
- **Limitações:** energia sem carga real; adapters físicos fora da cobertura de testes por
  design; retenção de transcrições consentida durante o estudo; Tuya não validado em hardware;
  título **direcional** (contribuição a um objetivo, não resultado alcançado).
- **Futuro:** Zigbee/Matter; comissionamento Tuya simplificado; *appliance* atualizável;
  multiusuário; avaliação com público idoso.
- **Visual:** duas colunas (Limitações | Futuro).

## SLIDE 13 — Conclusão
- **Forma fraca (demonstrada):** viabilidade técnica do controle local por voz pt-BR **sem
  dependência permanente de nuvem**.
- **Forma forte (direção):** a democratização passa pelo comissionamento — hipótese em aberto.
- **Fecho:** *"A nuvem, uma vez. A casa, para sempre."*
- Rodapé: repositório do projeto + "Obrigado / Perguntas".
- **Visual:** frase-princípio grande + tucano; contato/repo discretos.
