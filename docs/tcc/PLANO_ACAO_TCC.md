# Plano de Ação — Fortalecer o TCC CASAI antes da defesa

> Nota global atual: **5,5/10**. O artefato de software é forte (8/10 em engenharia); o que falta é o
> **trabalho acadêmico** (monografia, validação empírica, fundamentação) e o **reposicionamento honesto
> da tese**. Tudo abaixo foi verificado diretamente no repositório: não há `.tex`/`.bib`, não há
> agregação de `voice_commands` no código, o mock devolve energia fixa (`mock.adapter.ts:73-74` →
> `110W`, `kwhToday: 0.42`), a tarifa é `@default(0.92)` sem endpoint (`schema.prisma:71`), e o
> `confidence` é fórmula sintética (`voice-command.parser.ts:138` → `Math.min(0.99, 0.6 + score*0.15)`).
>
> **A prioridade nº 1 é existencial: não existe TCC escrito. Tudo o mais é secundário a isso.**

---

## 1. Tabela priorizada de pendências

Legenda de esforço: 🟢 ≤ 1 dia · 🟡 2–4 dias · 🔴 1+ semana. Estimativas para 1 autor em dedicação focada.

### 🔴 CRÍTICO — sem isto não há defesa (ou a banca derruba a tese nas 3 primeiras perguntas)

| # | O quê | Por que importa para a banca | Esforço | Como verificar que ficou pronto |
|---|---|---|:---:|---|
| **C1** | **Escrever a monografia em estrutura ABNT** (Introdução com problema/justificativa/objetivo geral/específicos/**hipótese**; Fundamentação; Trabalhos Relacionados; Materiais e Métodos; Desenvolvimento; Resultados; Discussão; Limitações; Conclusão/Trabalhos Futuros). | Sem documento não há TCC, independentemente da qualidade do software. Hoje `find` por `*.tex`/`*.bib`/`*monografia*` retorna **zero**. | 🔴 (2–3 sem) | Documento no repo, sumário ABNT, ≥ 1 referência citada por capítulo, hipótese escrita literalmente, cada objetivo específico amarrado a uma das 4 métricas. |
| **C2** | **Reposicionar título/tese** de "democratização social ampla" para o gancho técnico defensável: **soberania de dados local-first + voz pt-BR offline**, tratando custo e inclusão como hipóteses com limitações declaradas. | A tese atual ("democratizar") é afirmação sobre pessoas/mercado e ~3 dos 4 pilares não têm dado. Reposicionada, vira contribuição defensável. | 🟢 | Título e objetivos não prometem o que não se mede; limitações listam "custo e inclusão como hipóteses não validadas". |
| **C3** | **Coletar e reportar a métrica de voz** (acurácia de intenção + latência) com corpus mínimo. A infra de log **já existe** (`voice.service.ts:44,69,123`), mas **ninguém lê** — `grep` por agregação = zero. | "Qual a acurácia, com quantos comandos/falantes?" — hoje sem resposta. É a métrica **mais barata**: dados já gravados. | 🟡 | Tabela com WER do Whisper, matriz de confusão por intent, latência p50/p95, n de comandos e n de falantes. Ver §2.1. |
| **C4** | **Bill of Materials (BOM) honesto + tabela comparativa** vs. Echo Dot, Nest Mini, SmartThings, HA+Raspberry Pi. **Incluir o hub** no custo do CASAI — hoje `CLAUDE.md:149` diz "~R$130" sem fonte e omite o hub. | Derrubada trivial: "o PC sempre ligado não entra na conta; um Echo Dot é aparelho único". Pilar de custo cai sem planilha datada. | 🟡 | Planilha item/modelo/varejista/preço/data; 2 linhas para o CASAI (incremental vs. greenfield); comparativo de 5 eixos. Ver §2.3 e §3. |
| **C5** | **Fundamentar o PROBLEMA com dados BR citáveis** (IBGE, CETIC.br/TIC Domicílios, Anatel) e citar a **LGPD como Lei nº 13.709/2018**. `grep` confirmou **zero** ocorrências em todo o repo. | Cada palavra do título ("democratizar", "acesso", "Brasil") é alegação sem fonte. O maior risco não é o código — é não provar que o problema existe na escala afirmada. | 🟡 | Introdução com ≥ 3 fontes BR numeradas; tabela "alegação → fonte". Ver §3. |

### 🟡 IMPORTANTE — fecha lacunas que a banca cobrará, mas não inviabilizam a defesa

| # | O quê | Por que importa | Esforço | Como verificar |
|---|---|---|:---:|---|
| **I1** | **Trocar a fonte de energia do mock por leitura real da Tapo P110** num cenário controlado e reportar consumo antes/depois. Hoje exibe valores fixos (`mock.adapter.ts:74`). | "O dashboard mede consumo real?" — hoje não, no fluxo testado. A "prova de economia" depende disso. | 🟡 | CSV de `energy_readings` com leituras reais (n, período, watts/kWh); gráfico antes/depois. Ver §2.4. |
| **I2** | **Endpoint/DTO para editar a tarifa** `energyRate` (hoje `@default(0.92)` sem controller — `src/users/` não tem controller). | "Democratizar no Brasil real" exige tarifa por distribuidora; fixa em 0,92 fere a precisão da promessa de economia. | 🟢 | `PATCH /users/me` com validação `Min>0`; teste unitário; UI permite editar. |
| **I3** | **Teste de usabilidade mínimo com público-alvo** (n=3–5), protocolo enxuto com SUS. Hoje: zero persona, zero teste, zero TCLE. | "O que comprova que é acessível para um idoso?" — hoje, nada empírico. Mesmo n pequeno tira o pilar 4 da retórica. | 🟡 | Relatório com n, tarefas, taxa de sucesso, tempo, SUS, TCLE assinado. Ver §2.5. |
| **I4** | **Registrar limitações honestas no texto**: (a) "local-first" é **configuração, não fallback automático**; (b) EWS 410 nunca controlada; (c) refresh token sem rotação; (d) `transcript` persistido sem TTL. | Antecipar os ataques: melhor declarar como decisão de MVP do que ser pego. "Local-first" no título precisa de defesa precisa. | 🟢 | Capítulo de Limitações cobre os 4 pontos com evidência de código. |
| **I5** | **Escrever RELATED_WORK comercial** (Alexa/Google Nest/SmartThings) espelhando o rigor de `RELATED_WORK_Home_Assistant.md`. `grep` por Alexa/SmartThings/Nest = **zero**. | "Por que não usar Alexa?" — sem comparativo, o posicionamento competitivo não existe no texto. | 🟡 | Tabela de 5 eixos (custo do hub, nuvem obrigatória, soberania, pt-BR offline, commissioning sem app). |
| **I6** | **Distinguir 3 acurácias**: transcrição (Whisper), intenção (parser), ponta-a-ponta. **Nunca** apresentar `confidence` como acurácia. | Se apresentar a fórmula sintética como métrica científica, a banca desmonta. | 🟢 | Resultados separa as três; nota de rodapé explica que `confidence` é heurística, não probabilidade. |

### 🟢 DESEJÁVEL — eleva a nota e blinda contra perguntas finas

| # | O quê | Por que importa | Esforço | Como verificar |
|---|---|---|:---:|---|
| **D1** | Specs unitários para `tapo.adapter.ts` e `tuya.adapter.ts` (hoje excluídos da cobertura; o "80 %" omite o caminho de hardware). | "O caminho de hardware crítico não tem teste." Reprodutibilidade do 80 %. | 🟡 | Specs com lib mockada, cobrindo conversão de unidade e erro offline/rejeitado. |
| **D2** | `scenes.service.spec.ts` (hoje 0 % unit) + elevar `automations.service` (~48 %). | Cenas é serviço-alvo sem nenhum teste unitário. | 🟡 | Specs cobrem CRUD + isolamento por `userId`. |
| **D3** | Formalizar ADRs em `docs/adr/000N-*.md` (hoje só prosa no CLAUDE.md). | Banca de engenharia valoriza decisões rastreáveis. | 🟢 | `docs/adr/` com contexto/decisão/consequências/status. |
| **D4** | Política de retenção/anonimização para `voice_commands.transcript` + `ExceptionFilter` global (`grep @Catch` = 0). | LGPD: texto falado fica gravado indefinidamente. Erros vazam como 500 sem formato. | 🟢 | TTL ou opt-in documentado; filtro global retornando erro padronizado em pt-BR. |
| **D5** | Auditoria WCAG (Lighthouse a11y + axe/jest-axe), corpo de texto ≥ 16 px, `aria-current` na nav. | Acessibilidade alegada mas frágil (tipografia 11–14 px, nav só por cor). | 🟡 | Relatório Lighthouse anexado; `aria-current="page"` na tab ativa. |

---

## 2. Roteiro de validação / experimento (realista para TCC)

Objetivo: produzir, com esforço mínimo, dado empírico para **cada uma das 4 métricas** do `CLAUDE.md §11`.
Versione todos os artefatos (CSV, áudios, planilha) no repo para reprodutibilidade.

### 2.1 Acurácia de voz + latência voz→ação (a mais barata — dados já são gravados)

**Corpus** (1 dia): grave **N ≥ 50 enunciados** pt-BR cobrindo as intenções suportadas
(`turnOn/turnOff/toggle/setBrightness/setColor`), com **≥ 3 falantes** (idealmente sotaques/idades
diferentes), incluindo variações coloquiais ("desligua", "apaga", "bota a luz no máximo") e ≥ 10
enunciados fora do vocabulário (para medir taxa de `unknown`). Anote `intent`-ouro e `transcript`-ouro.
Commit em `apps/api/test/fixtures/voice-corpus/`.

**Execução** (1 dia): script que envia cada `.wav` para `POST /voice/command`, captura `transcript`,
`intent`, `confidence`, `success`, `latencyMs` (todos já retornados/gravados). Depois rode uma **query
de agregação** sobre `voice_commands` (que hoje não existe em lugar nenhum) para extrair:
- **WER** do Whisper = `transcript` vs. `transcript`-ouro (distância de edição por palavra).
- **Acurácia de intenção** = matriz de confusão `intent` vs. `intent`-ouro.
- **Acurácia ponta-a-ponta** = % de comandos que resultaram na ação correta.
- **Latência** p50/p95 a partir de `latencyMs`.

**Reportar** as três acurácias separadas (I6) + latência. Se ficar abaixo de 88 %, **reporte o número
real e discuta** — um TCC honesto com 81 % medido vale mais que 88 % alegado.

### 2.2 Endpoint de relatório (transforma a infra em evidência)

Crie `GET /voice/stats` agregando `voice_commands` (`avg/p95 latencyMs`, taxa de `success`,
distribuição de `confidence`, contagem por `intent`). Os dados já são gravados; falta apenas consumi-los.
Vira tanto evidência da monografia quanto funcionalidade defensável.

### 2.3 Custo (BOM)

Planilha datada: item | modelo | varejista | preço | data | fonte (URL). Linhas mínimas: lâmpada
(EWS 410), tomada (Tapo P110), **hub** (duas variantes: "mini-PC dedicado ~R$X" e "notebook já existente
= R$ 0 incremental"). Total em **duas colunas honestas**: greenfield vs. incremental. Tabela comparativa
de 5 eixos vs. Echo Dot / Nest Mini / SmartThings / HA+Raspberry Pi (custo do hub, nuvem obrigatória,
soberania de dados, pt-BR offline, commissioning sem app do fabricante).

### 2.4 Energia antes/depois (requer Tapo real no fluxo)

1. Configurar um device físico real (Tapo P110) com protocolo `TAPO` no banco (não `MOCK` — o seed
   força `MOCK`, `seed.ts:52`).
2. **Cenário A (sem automação):** deixe um aparelho ligado por período fixo (ex.: 24 h) e registre o
   consumo lido pelo poller em `energy_readings`.
3. **Cenário B (com automação):** crie uma rotina que desliga o aparelho fora do horário de uso; rode
   o mesmo período.
4. Reporte kWh A vs. B, custo em R$ (com a tarifa real via I2), n de leituras e período. **Documente o
   protocolo** (qual aparelho, potência, janela). Não generalize além do medido.

### 2.5 Teste de usabilidade com público-alvo (protocolo enxuto)

- **Participantes:** n = 3–5, do público-alvo declarado (idosos / baixa familiaridade digital). Declare
  amostra de conveniência (limitação honesta).
- **Ética:** TCLE de 1 página (consentimento, gravação opcional, direito de parar) — confirme com a
  coordenação se o comitê de ética é exigido.
- **Tarefas** (think-aloud + observação): (1) instalar o PWA; (2) "ligue a luz da sala"; (3) "ligue a
  luz por voz"; (4) criar uma rotina simples; (5) ver o consumo de energia.
- **Métricas:** taxa de sucesso por tarefa, tempo por tarefa, n de erros/ajudas, e **SUS** (10 itens,
  escala 1–5) ao final.
- **Saída:** tabela de resultados + score SUS médio + 3–5 observações qualitativas. Com n pequeno,
  trate como **estudo exploratório**, não confirmatório.

---

## 3. Referências a buscar e citar (o quê citar e onde usar — sem inventar números)

> Não invente cifras; ao escrever, abra a fonte e cite o dado exato com ano. Abaixo, o **tipo de fonte**
> e **onde usar** no texto.

**Problema social / exclusão digital (Introdução, Justificativa)**
- **CETIC.br — TIC Domicílios** (anual): acesso à internet, posse de smartphone/computador por classe e
  faixa etária → sustenta "acesso desigual" e "barreira de custo".
- **IBGE — PNAD Contínua TIC** e **Censo 2022 / Projeções de população**: envelhecimento, % de idosos,
  renda domiciliar → sustenta "idosos" e "baixa renda".
- **Anatel**: penetração de banda larga fixa/móvel → sustenta a dependência de conectividade do modelo.

**Custo / mercado de assistentes (BOM, Trabalhos Relacionados — C4/I5)**
- **Preços de varejo BR datados** (e-commerce nacional) para Echo Dot, Nest Mini, SmartThings Hub,
  Raspberry Pi 4, lâmpada/tomada smart → tabela comparativa de custo (cite data e loja).
- **Grand View Research / Statista** (tamanho de mercado smart home): contextualiza relevância → Introdução.

**LGPD / soberania de dados (capítulo de Privacidade — C5/I4)**
- **Lei nº 13.709/2018 (LGPD)** — artigos sobre dado pessoal e minimização → fundamenta áudio descartado
  e `local_key` cifrada.
- **Kleppmann et al., 2019, "Local-first software"** — definição acadêmica do termo "local-first" usado
  dezenas de vezes no projeto sem fundamentação → Fundamentação Teórica (essencial: é o pilar do título).

**Acessibilidade (capítulo de UX — I3/D5)**
- **WCAG 2.1/2.2 (W3C)** — critérios 2.5.5/2.5.8 (alvo de toque, já a 44 px), 1.4.1 (uso de cor),
  1.4.3 (contraste) → justifica decisões de a11y.
- **NBR 17225 / eMAG** (acessibilidade BR/gov), se aplicável.
- **Pradhan et al., 2020** e **Gonçalves et al., 2017** (já no `Revisao_Senior.txt`) — idosos e
  assistentes de voz/tecnologia → Fundamentação sobre público-alvo.

**Voz / STT / smart home (Fundamentação — C3)**
- **Radford et al., 2022 (Whisper / OpenAI)** — modelo STT usado → justifica escolha técnica e
  contextualiza WER esperado.
- Benchmark de **WER do Whisper em pt-BR** (procurar paper/relatório específico) → contextualiza a meta
  de 88 %.
- **Meneghello et al., 2019** (segurança IoT) e **Ling et al., 2017** (já no gate) → Fundamentação de
  IoT/segurança.

**Ação imediata:** migrar as ~13 referências já curadas em `Revisao_Senior.txt` (fora do repo) para um
`.bib`/capítulo **dentro do repo**, em ABNT validado com DOI/acesso. Montar a tabela **"alegação →
fonte"** amarrando cada afirmação do título a pelo menos uma referência.

---

## 4. Riscos da demonstração ao vivo e plano B

| Risco | Probabilidade | Plano B |
|---|:---:|---|
| **EWS 410 (lâmpada Tuya) falha ao vivo** — nunca controlada; contradição DPS 20 vs 1; sem `work_mode` no LAN. | Alta | **Não tentar a lâmpada ao vivo.** Declarar como limitação honesta. Demonstrar a Tapo (provada) e mostrar o adapter + spike `ews410-bootstrap.cjs` como "pronto para quando parear". |
| **Tapo parece "quebrada" na rede da banca** — timeout 5 s vira 503 sem retry (`devices.service.ts`). | Média | **Levar roteador/hotspot próprio** com a Tapo já pareada. Testar a rede 30 min antes. Ter **vídeo gravado** do controle local real (com latências na tela). |
| **Voz não transcreve ao vivo** — Whisper depende de CPU; sala barulhenta degrada o STT (janela fixa 3 s sem VAD, `voice-fab.tsx:57`). | Média | Demonstrar via **texto** (`POST /voice/command` aceita transcript direto, mesmo parser). Ter **vídeo** de comando de voz em ambiente silencioso. |
| **Deploy público dorme** — Render free dorme após 15 min (`ESCOPO_MELHORIA.md:178`). | Alta | **"Acordar" o serviço 5 min antes** com um request. Ter o **stack local** como primário e o deploy só como prova de "custo R$ 0". |
| **Reseed apaga a Tapo real** — `seed.ts:52` força `MOCK` para todos os devices. | Média | **Não rodar seed antes da defesa.** Backup do banco com o device Tapo real. Ter **modo MOCK** pronto (roda 100 % sem hardware). |
| **Qualquer hardware falha** | — | **Modo MOCK como rede de segurança geral** + **vídeo gravado** de 2–3 min: controle local Tapo (latência na tela), comando de voz, dashboard de energia, criação de rotina. |

**Regra de ouro da demo:** o que está **provado** (Tapo P110 via KLAP, 201–332 ms em
`docs/hardware/devices-analysis.md`) é a estrela; o que **não está** (EWS 410) entra apenas como código +
limitação declarada. **Nunca** apresente o adapter Tuya LAN como "funcionando em hardware".

---

## 5. Sequência sugerida (≈ 2–3 semanas)

1. **Dias 1–3:** C2 (reposicionar) + C3/§2.1 (corpus de voz, métrica) + §2.2 (endpoint stats).
   *Destrava a parte empírica mais barata.*
2. **Dias 4–6:** C4/§2.3 (BOM + comparativo) + I1/§2.4 (energia real Tapo) + I2 (tarifa editável).
3. **Dias 7–9:** C5 + I5 (fundamentação BR/LGPD + concorrentes) + I3/§2.5 (teste de usabilidade n=3–5).
4. **Dias 10–21:** C1 (escrever a monografia, integrando todos os artefatos acima) + I4/I6 (limitações
   + 3 acurácias) + gravar vídeo de demo (plano B).

Os arquivos-chave para ancorar o texto já existem e são fortes: `docs/monografia/RELATED_WORK_Home_Assistant.md`
(material de capítulo quase pronto) e `docs/hardware/devices-analysis.md` (vira a seção de Resultados de hardware).
