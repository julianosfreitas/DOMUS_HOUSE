# Análise rigorosa do CASAI como TCC

> Avaliação de orientador/banca sobre o estado atual do projeto, frente ao tema
> **"Democratizando o acesso à casa inteligente no Brasil"**.
> Tudo abaixo foi verificado diretamente no código, nos testes e nos `docs/`
> (não em alegações do README). Onde há divergência entre o que o projeto **diz**
> e o que o código **faz**, ela está marcada explicitamente.
>
> **Nota global no estado atual: 5,5 / 10.**
> Software forte (8/10 em engenharia); o que falta é o **trabalho acadêmico**
> (monografia, validação empírica, fundamentação) e o **reposicionamento honesto da tese**.

---

## 1. Sumário executivo

O CASAI é um **artefato de engenharia maduro e bem acima da média de TCC de graduação**,
mas é uma **contribuição científica ainda não demonstrada**. As alegações técnicas centrais
se confirmam no código: o *adapter pattern* é real e não-decorativo (interface única, factory
por enum, 5 adapters, nenhuma lib de IoT vazando para os serviços), a segurança é estrutural
e defensável (AES-256-GCM com IV/auth-tag, JWT global, anti-enumeração de contas, escopo por
`userId`), e há **uma prova empírica sólida**: o controle local da **Tapo P110 via KLAP**, com
latências medidas (201–332 ms), códigos HTTP corretos e ausência comprovada de *fallback* mock
silencioso (`docs/devices-analysis.md`). Esse é o coração defensável do trabalho.

O problema é que a **tese anunciada no título** — "democratizar o acesso à casa inteligente
no Brasil" — é uma afirmação **sobre pessoas e mercado** (custo proibitivo, exclusão digital,
idosos, soberania de dados), e dela praticamente nada está demonstrado:

- **Não existe monografia no repositório** (zero `.tex`/`.bib`/capítulos).
- **Zero dado brasileiro citado** (IBGE / CETIC.br / Anatel = 0 ocorrências).
- **Zero comparação** com Alexa / Google Nest / SmartThings em qualquer doc.
- **Nenhuma Bill of Materials** para sustentar o custo `< R$ 200`.
- **Nenhum teste com usuários** do público-alvo.
- **Nenhuma das 4 métricas-critério** do `CLAUDE.md §11` (acurácia ≥ 88 %, latência < 2 s,
  energia antes/depois, custo < R$ 200) foi coletada ou analisada. A infraestrutura de log
  existe (`voice_commands` grava `latencyMs`, `confidence`, `intent`), mas **ninguém lê esses
  dados** — `grep` por agregação retorna **zero**.

Pior, três detalhes minam a leitura ingênua das métricas: o `confidence` exibido é uma **fórmula
sintética** (`0.6 + score·0.15`, `voice-command.parser.ts:138`), **não** uma probabilidade medida;
a energia mostrada vem do **MockAdapter com valores fixos** (110 W, 0,42 kWh — `mock.adapter.ts:73-74`);
e a **segunda metade do hardware-alvo** (lâmpada Tuya EWS 410) **nunca foi controlada em hardware**.

**Veredito de orientador:** o artefato vale a defesa, mas no estado atual o **trabalho escrito não
existe** e a tese está **reposicionada incorretamente**. O caminho de sobrevivência **não** é defender
"democratização social ampla" (que a banca derruba em três perguntas), e sim ancorar a contribuição
no gancho técnico genuíno e já documentado — **soberania de dados *local-first* + *commissioning* sem
o app do fabricante** (`docs/RELATED_WORK_Home_Assistant.md`, que é excelente) — tratando custo e
inclusão como **hipóteses honestamente limitadas**. Com **2–3 semanas** de execução focada (corpus de
voz, BOM comparativo, 1 teste de usabilidade n=5, escrever a monografia ABNT migrando as ~13 referências
já curadas), o trabalho passa com folga. Sem isso, é um software excelente **sem TCC**.

---

## 2. Tabela de notas (rubrica)

Notas calibradas (não infladas). Onde a dimensão tem duas faces — *o que foi construído* vs.
*o que foi comprovado* — elas estão separadas de propósito, porque a banca avalia as duas.

| # | Dimensão | Nota | Em uma linha |
|---|----------|:----:|--------------|
| 1 | Arquitetura e engenharia de software | **8,0** | Adapter pattern real, fila por device, segurança estrutural, CI sério — o ponto mais forte. |
| 2 | Voz / STT pt-BR (implementação) | **6,5** | Pipeline limpo e desacoplado, roda no hub, descarta áudio — mas é parser por regras, não NLU. |
| 3 | Voz / STT pt-BR (eficácia comprovada) | **2,0** | Zero medição de acurácia/latência; `confidence` é fórmula sintética; sem corpus. |
| 4 | Dispositivos e hardware real | **6,0** | Tapo P110 provada ao vivo (forte); EWS 410 nunca controlada; contradição DPS 20 vs 1 viva. |
| 5 | Backend (automações/cenas/energia/auth) | **7,0** | Funcionalidades reais e seguras; mas energia vem de mock fixo e tarifa R$/kWh não é editável. |
| 6 | Frontend PWA e UX | **6,0** | PWA instalável e mobile-first sólido; mas nenhum design rastreável a idosos/baixa-literacia. |
| 7 | Acessibilidade para o público-alvo | **4,0** | Aria-labels / 44 px / TTS genuínos; tipografia 11–14 px, login animado e zero auditoria WCAG contradizem a tese. |
| 8 | Documentação de engenharia | **8,0** | README, RUNBOOK e RELATED_WORK_HA exemplares — fundamentação técnica em nível de artigo. |
| 9 | Lastro acadêmico e referências | **3,0** | Sem monografia, sem ABNT, zero dado BR, zero LGPD como lei, zero comparativo comercial. |
| 10 | Método acadêmico e validação | **3,0** | Tese construída, não demonstrada: nenhuma das 4 métricas coletada, nenhum estudo com usuários. |
| 11 | Força da tese de democratização | **4,0** | ~1 de 4 pilares sustentado (local-first); custo e inclusão são retórica sem dado empírico. |

**Leitura da rubrica:** a metade "engenharia" (linhas 1, 2, 5, 8) está entre 6,5 e 8.
A metade "ciência/tese" (linhas 3, 7, 9, 10, 11) está entre 2 e 4. O TCC inteiro vive ou morre
em **fechar esse vão** — e o material para fechá-lo, em boa parte, já existe no próprio repositório.

---

## 3. Análise ponto a ponto

Cada item: o que foi **verificado**, a nota e a evidência citável.

### 3.1 Adapter pattern (arquitetura) — 8,5
**Verificado.** Interface `DeviceAdapter` única, factory por enum `Protocol` com *decrypt* só em
memória, 5 adapters concretos, nenhum serviço chama `tuyapi`/`tp-link` direto. É o pilar técnico que
sustenta "extensível a hardware barato heterogêneo". `DeviceCommandQueue` com limpeza de `Map`
resolve um problema físico real (1 conexão Tuya por vez). Modelagem de erro 503 vs 422 madura.
→ `device-adapter.factory.ts:35-53`, `device-command.queue.ts:25-29`, `devices.service.ts:331-343`.

### 3.2 Local-first como mecanismo vs. configuração — 5,0
**Verificado e grave.** `grep` em `devices.service.ts` confirma **zero** *fallback* local→nuvem.
`TUYA` e `TUYA_CLOUD` são protocolos **separados** escolhidos no cadastro. O princípio nº 1 do
`CLAUDE.md` ("tenta a LAN primeiro, nuvem como *fallback* explícito") **não está implementado** como
*fallback* automático — é **local-OU-nuvem por configuração**. A palavra "local-first" do título
precisa de **defesa precisa** ou cai. → `device-adapter.factory.ts:36-40`.

### 3.3 Voz: pipeline e arquitetura — 6,5
**Verificado.** Porta `SpeechToText` abstrata, Whisper no hub, áudio descartado no `finally` (LGPD
verificável), degradação graciosa via `optionalDependency`, TTS pt-BR. Bem construído. Mas o
reconhecedor de intenção é **casador de regras** (listas de verbos hardcoded), não NLU, e o
vocabulário é estreito (sem "aumenta/diminui" relativo, sem cena por voz).
→ `whisper.stt.ts:30-49`, `voice-command.parser.ts:42-65`.

### 3.4 Voz: comprovação de acurácia/latência — 2,0
**Verificado o pior cenário.** `grep` por `voiceCommand.findMany/aggregate/groupBy/_avg` = **zero**.
A `latencyMs` é gravada mas **nunca lida**. `confidence = Math.min(0.99, 0.6 + score*0.15)` é fórmula
sintética (`parser:138`), **não probabilidade do modelo**. Nenhum `.wav`, nenhum corpus, nenhuma matriz
de confusão. As duas métricas que o `§11` elege como **critério de sucesso** são alegações puras.

### 3.5 Hardware: Tapo P110 — 8,0
**Verificado e forte.** `docs/devices-analysis.md` mostra prova metodologicamente sólida — 200 em
`turnOn` (201 ms) / `turnOff` (332 ms), 501 correto para `setBrightness`/`setColorTemp` (P110 é tomada),
e o argumento de que receber 200 prova conexão real porque `handleControlError` lançaria 503/422 (sem
*fallback* mock silencioso). **Esta é a melhor evidência empírica do TCC.**

### 3.6 Hardware: lâmpada EWS 410 (Tuya) — 3,0
**Verificado.** Nunca controlada em hardware. `tuya.adapter.ts:16` usa `POWER:20` (v2) e Kelvin piso
2700 K hardcoded; o `README:44` admite a contradição **DPS 20 vs 1 não-resolvida** e Kelvin real
3000–6500 K. `setColor`/`setColorTemp` não escrevem `work_mode` no caminho LAN. **Metade do
hardware-alvo**, central para "Tuya white-label barato", é código não validado.

### 3.7 Backend: automações e cenas — 7,0
**Verificado.** `validateSchedule` valida o cron **antes** do INSERT (evita 500 com automação
inagendável), `TIME_RANGE` trata virada de meia-noite, `ActionsRunner` tolera falha por ação. Mas
`scenes.service.ts` tem **0 % de cobertura unitária** (sem spec) e `automations.service` ~48 % — os
caminhos felizes dependem do e2e que exige Postgres. → `automations.service.ts:150-163`, `conditions.ts:9-17`.

### 3.8 Backend: energia e custo em R$ — 6,0
**Verificado.** Pipeline real (polling, agregação por balde, retenção 35 d, teto 20 k linhas), mas o
kWh vem **cru do adapter** — `mock.adapter.ts:74` devolve 0,42/12,8 fixos. A tarifa `energyRate` é
*default* 0,92 **sem endpoint de edição** (`src/users/` não tem controller) — fere a promessa de
"economia para o Brasil real", onde a tarifa varia por distribuidora. → `energy.service.ts:201-222`.

### 3.9 Segurança e auth — 8,0
**Verificado.** AES-256-GCM com IV 12 bytes e auth tag, refresh hasheado SHA-256 com revogação,
anti-enumeração de contas (mesma exceção para 3 ramos), Google exige `email_verified`, JWT global.
Ponto sólido. Dívidas honestas a **declarar**: sem rotação de refresh token (TODO v2), sem
`ExceptionFilter` global (`grep @Catch` = 0). → `crypto.service.ts:35-58`, `auth.service.ts:30-36,79-96`.

### 3.10 Frontend e acessibilidade ao público-alvo — 5,0
**Verificado o descompasso.** PWA instalável e mobile-first reais (defensáveis como "acesso"), mas
**zero evidência de design para idosos**: tipografia dominante `text-xs`/`text-sm` (11–14 px) contra
poucos `text-base`, login multi-step com confete/glass, gamificação com jargão, **nenhuma auditoria
WCAG** (sem Lighthouse/axe/jest-axe no repo). A alegação "projetado para baixa familiaridade digital"
é **não comprovada**. Defensável só nos pontos pontuais: `aria-label`, alvo de toque 44 px, TTS,
`reduced-motion`.

### 3.11 Trabalho relacionado (Home Assistant) — 8,5
**Verificado e exemplar.** `docs/RELATED_WORK_Home_Assistant.md` distingue **controle** vs.
**commissioning**, cita docs oficiais com verificação adversarial, referencia *issues* reais. É
material de capítulo quase pronto. **Paradoxo:** defende uma tese técnica estreita (*commissioning*
local-first) **diferente** da democratização social anunciada — e o gargalo atual é justamente que o
*commissioning* ainda não fechou em hardware.

### 3.12 Lastro acadêmico / referências — 3,0
**Verificado.** Zero IBGE/CETIC/Anatel/ABNT no repo; LGPD nunca citada como **Lei 13.709/2018**; zero
comparação com Alexa/Google/SmartThings em qualquer doc. As ~13 referências reais vivem num `.txt` de
*gate* **fora do repo**. O autor **sabe** fundamentar (prova: `RELATED_WORK`), mas **não aplicou** esse
rigor à fundamentação social.

### 3.13 Método e estrutura de monografia — 3,0
**Verificado.** Nenhum `.tex`/`.bib`/capítulo no repo; `grep` por *hipótese / objetivo geral /
metodologia / justificativa* em README/CLAUDE/RUNBOOK = **zero**. As 4 métricas têm infra de log mas
**zero coleta/análise**. Nenhum teste com usuários, TCLE ou SUS. A tese de democratização está
**construída, não demonstrada**.

---

## 4. Pontos fortes (o que defender com confiança)

1. **Adapter pattern genuíno e não-decorativo** — interface única, factory por enum com *decrypt* só
   em memória, 5 adapters, nenhuma lib de IoT vazando para controllers/serviços. Engenharia acima da
   média de TCC. `device-adapter.factory.ts:35-53`.
2. **Prova empírica sólida de controle local** — Tapo P110 via KLAP comprovada ao vivo, latências
   201–332 ms, códigos HTTP corretos, argumento metodológico de que 200 prova conexão real (sem
   *fallback* mock silencioso). `docs/devices-analysis.md`.
3. **Segurança estrutural defensável** — AES-256-GCM com IV/auth-tag, refresh hasheado SHA-256 com
   revogação, anti-enumeração de contas, Google exigindo `email_verified`, JWT global, escopo por
   `userId` em todas as queries — com testes provando round-trip e isolamento.
4. **`DeviceCommandQueue`** resolve um problema físico real (1 conexão Tuya por vez) com encadeamento
   de Promises por `deviceId` e limpeza de `Map` que evita *memory leak*. `device-command.queue.ts:25-29`.
5. **`RELATED_WORK_Home_Assistant.md`** é material de capítulo quase pronto: distingue controle vs.
   *commissioning*, cita fontes oficiais com verificação adversarial — único lugar onde o rigor
   acadêmico já aparece.
6. **Modelagem de erro madura e uniforme** — `DeviceOfflineError`→503 vs. `DeviceCommandError`→422,
   evitando marcar OFFLINE uma lâmpada que apenas rejeitou o comando. `devices.service.ts:331-343`.
7. **CI sério** — 3 jobs (lint, cobertura com *threshold* enforçado, prisma migrate, `audit-ci` com
   *allowlist* justificada, `gitleaks`) e infra de deploy custo-zero (Render + Vercel + Neon) que
   reforça a narrativa "sem mensalidade".
8. **Pipeline de voz desacoplado** rodando Whisper **no hub** e descartando o áudio no `finally`
   (verificável no código, não só no README) — gancho concreto de privacidade/LGPD.
9. **Documentação de engenharia honesta** sobre o próprio estado (o README declara o gargalo da EWS 410
   e a contradição de DPS abertamente) — maturidade rara em TCC.

---

## 5. Lacunas críticas (priorizadas)

| Prioridade | Lacuna | Impacto na defesa |
|:----------:|--------|-------------------|
| **Alta** | **Não existe monografia** (zero `.tex`/`.bib`/capítulos; sem problema/hipótese/objetivos/metodologia escritos). | Sem o documento, **não há TCC** para defender, independentemente da qualidade do software. É a lacuna nº 1. |
| **Alta** | **Nenhuma das 4 métricas** (acurácia, latência, energia, custo) foi coletada. Infra de log existe, mas `grep` por agregação = zero. | "Qual a acurácia medida, com quantos falantes? Quanto economizou de energia?" — hoje **sem resposta**. A tese passa de demonstrada a alegada. |
| **Alta** | **`< R$ 200` sem Bill of Materials**, sem fonte de preço, sem comparativo; o cálculo **omite o hub** (PC/mini-PC sempre ligado). | A banca derruba o "menos de R$ 200" trivialmente apontando que falta somar o hub. Pilar inteiro cai sem planilha datada. |
| **Alta** | **"Sem conhecimento técnico / inclusão de idosos" sem evidência**: zero teste de usabilidade, e o onboarding exige obter `local_key` + Device ID pelo portal Tuya IoT. | O público que a tese diz incluir é justamente o que o onboarding atual **exclui**. Pilar é retórica pura sem ao menos n=5. |
| **Alta** | **EWS 410 nunca controlada em hardware**; contradição DPS 20 vs 1 e Kelvin 2700 vs 3000 K não resolvidas. | "Qualquer família monta com EWS 410 + Tapo" está sustentado **pela metade**. Risco de demo falhar ao vivo. |
| **Alta** | **Zero fundamentação social com dados BR** (IBGE/CETIC/Anatel = 0); LGPD nunca citada como lei; concorrentes ausentes. | Cada palavra do título é alegação sem citação. O maior risco **não é o código**, é não provar que o **problema** existe na escala afirmada. |
| **Média** | **Energia exibida vem do mock** (110 W, 0,42 kWh fixos) e tarifa R$/kWh hardcoded em 0,92 sem edição. | A "prova de economia" não é medida com hardware no fluxo testado; o custo em R$ não se adapta à distribuidora. |
| **Média** | **`confidence` sintético** apresentável por engano como "acurácia"; parser cobre vocabulário estreito. | Se apresentar `confidence` como acurácia, a banca desmonta. Separar acurácia de transcrição vs. de intenção vs. ponta-a-ponta. |
| **Média** | **Acessibilidade frágil**: tipografia 11–14 px, login animado, zero auditoria WCAG. | "Projetado para baixa familiaridade digital" é **contradito pela própria UI**. |
| **Baixa** | Cobertura exclui adapters de hardware e `scenes.service` (0 % unit); o "80 %" omite o caminho físico. | Banca pode questionar reprodutibilidade do "80 %" e a ausência de teste no caminho de hardware. |

---

## 6. Veredito sobre a tese de democratização (os 4 pilares)

A tese, como **enunciada em 4 pilares sociais**, **não se sustenta** no estado atual — está apoiada em
**~1 dos 4 pilares**.

| Pilar | Veredito | Por quê |
|-------|:--------:|---------|
| **1. Baixo custo (< R$ 200)** | ❌ não sustentado | Sem BOM, sem comparativo, **omite o hub**. Um Echo Dot é aparelho único e completo. |
| **2. Acessibilidade por voz pt-BR** | 🟡 frágil isolado | Alexa/Google já fazem NLU pt-BR **superior**. O diferencial real é pt-BR **offline** — que é o pilar 3, não este. |
| **3. Local-first / soberania de dados** | ✅ defensável | **Único pilar com evidência material**: controle local comprovado (Tapo via KLAP), Whisper no hub, áudio descartado. |
| **4. Sem conhecimento técnico / inclusão** | ❌ não sustentado | Zero teste de usabilidade; onboarding exige `local_key` via portal Tuya — **contradição direta**. |

**A tese SE SUSTENTA sob reposicionamento honesto**, cumpridas 3 condições:
1. **Mover o peso da contribuição** do discurso social amplo para o gancho técnico forte e já
   documentado — **soberania de dados local-first + commissioning sem o app do fabricante**.
2. Tratar **"baixo custo" e "inclusão" explicitamente como HIPÓTESES** com limitações declaradas,
   não como fatos provados.
3. Produzir o **mínimo empírico** que a banca exige — um BOM comparativo honesto (incluindo o hub),
   um teste de usabilidade n=3-5, e a coleta real de **pelo menos uma** das 4 métricas (a **latência
   de voz** é a mais barata: os dados já são gravados, falta só **agregá-los**).

Sem reposicionar e sem esse mínimo empírico, a democratização é retórica que a banca desmonta nas
primeiras perguntas. Com o reposicionamento, vira uma **prova-de-conceito defensável e honesta** de
automação local-first de baixo custo.

---

## 7. Posicionamento vs. concorrentes

O CASAI **não** deve se posicionar como "Alexa mais barata" — perde nessa comparação (NLU,
naturalidade, ecossistema). Deve competir no eixo onde os concorrentes **estruturalmente perdem**:
**soberania de dados + ausência de nuvem/mensalidade + commissioning local**.

- **vs. Alexa / Google Nest:** exigem nuvem obrigatória, enviam áudio/comandos para servidores de big
  tech, fazem perfilamento e podem descontinuar o aparelho remotamente. O CASAI processa voz no hub
  local (Whisper), descarta o áudio após transcrever e mantém os dados na LAN. *Fraqueza honesta a
  declarar:* o NLU do CASAI é parser por regras, muito inferior — o diferencial é "local", não "mais
  inteligente".
- **vs. Samsung SmartThings:** depende de hub proprietário + nuvem Samsung; o CASAI roda em hardware
  genérico e é auditável. Mas SmartThings tem Matter/Zigbee nativos — o CASAI ainda não (ZIGBEE é só
  enum provisionado).
- **vs. Home Assistant** (o concorrente **mais perigoso** para a tese, porque também é local): é o
  posicionamento mais importante e o **único já bem documentado**. O HA é maduro em **controle**, mas
  suas integrações Tuya/TP-Link **pressupõem o app do fabricante para o pareamento/commissioning**. A
  contribuição real e defensável do CASAI é **fechar esse gap de commissioning local-first sem o app
  do fabricante** — é aqui que a originalidade vive. *Fraqueza crítica:* o próprio commissioning da
  EWS 410 ainda **não fechou em hardware**, então a contribuição central precisa ou ser demonstrada
  antes da defesa, ou declarada como "arquitetura proposta + validação parcial".

**Recomendação:** construir uma **tabela comparativa de 5 eixos** — custo do hub · dependência de
nuvem · soberania de dados · suporte pt-BR offline · commissioning sem app do fabricante — cobrindo
Alexa, Google Nest, SmartThings, HA+Raspberry Pi e CASAI, espelhando o rigor já aplicado ao HA.

---

## 8. Perguntas prováveis da banca (com resposta-âncora)

1. **"Qual a acurácia de intenção de voz que mediram, com quantos comandos e falantes?"**
   → Infra de medição existe (`voice_commands`), mas a **coleta não foi concluída**; apresentar como
   limitação declarada + o protocolo de avaliação definido. **Não** apresentar o `confidence`
   (`0.6+score·0.15`) como acurácia — é heurística de capacidade, não probabilidade.
2. **"Custa < R$ 200, mas precisa de um computador sempre ligado. Por que isso não entra no custo?"**
   → Reconhecer que o hub é pré-requisito; apresentar BOM em **dois cenários** (incremental sobre PC
   existente vs. greenfield); diferencial é **soberania**, não centavos.
3. **"Por que não usar Alexa ou Google, que fazem pt-BR melhor?"**
   → O diferencial é funcionar **100 % local, sem nuvem/mensalidade, áudio descartado** — terreno onde
   Alexa/Google estruturalmente perdem.
4. **"É mesmo local-first ou cai para a nuvem?"**
   → Ser **preciso**: caminho local é primário **por configuração** e o sistema **avisa quando falha**
   (não cai em silêncio, princípio nº 1); *fallback* automático foi decisão de MVP. Defender a precisão
   do termo, não inflá-lo.
5. **"A lâmpada Intelbras funcionou em hardware?"**
   → Assumir que a EWS 410 **não foi pareada a tempo** (gargalo de provisionamento no SmartLife, não de
   código); a prova de hardware é a **Tapo P110**; declarar a lâmpada como limitação honesta e mostrar
   o adapter + spike pronto.
6. **"O dashboard de energia mede consumo real?"**
   → O backend **não estima kWh** — consome o valor reportado nativamente pelo medidor Tapo P110; no
   mock os valores são fixos. Prova de economia = coleta empírica antes/depois (trabalho a fazer).
7. **"Qual é a sua hipótese e como você a testou?"** — *o ponto mais perigoso sem monografia.*
   → Ter a hipótese escrita ("é viável montar automação residencial funcional, local-first e por voz
   pt-BR com hardware de baixo custo") e amarrar cada objetivo específico a uma das 4 métricas; admitir
   o que foi testado (controle local Tapo) e o que é trabalho futuro.
8. **"O que comprova acessibilidade para um idoso / baixa familiaridade digital?"**
   → Hoje, nada empírico; defender os elementos pontuais reais (TTS pt-BR, alvo 44 px, `aria-labels`,
   `reduced-motion`, PWA sem loja) como design **de acesso**, e declarar a validação de usabilidade
   como limitação/trabalho futuro — ou, idealmente, **ter rodado n=5 antes da defesa**.
9. **"A gamificação tem base científica?"**
   → Os pesos (15/25/30/20) são arbitrários e sem literatura citada; defender como **recurso de
   produto** para engajamento, **não** como contribuição científica.
10. **"Como garantem a privacidade dos dados de voz?"** — *resposta forte.*
    → Áudio descartado no `finally` após transcrição (`whisper.stt.ts`), `local_key` cifrada
    AES-256-GCM, processamento no hub. *Limitação a declarar:* o `transcript` em texto fica persistido
    sem política de retenção → propor TTL/anonimização e citar a **LGPD (Lei 13.709/2018)**.

---

## 9. Título recomendado

**Recomendado:**
> **CASAI: automação residencial local-first e de baixo custo com controle por voz em português —
> uma prova de conceito de soberania de dados doméstica**

**Alternativos:**
- Soberania de dados na casa inteligente brasileira: controle local de dispositivos IoT por voz em
  pt-BR sem dependência de nuvem.
- CASAI: um hub de automação residencial local-first que comissiona e controla dispositivos Tuya e
  Tapo sem o app do fabricante.
- Automação residencial de baixo custo no Brasil: arquitetura local-first, voz em português no hub e
  privacidade por design (LGPD).
- Reduzindo a barreira de acesso à casa inteligente: hub local-first, instalável como PWA, com comando
  de voz offline em pt-BR.

Os três títulos de exemplo do enunciado original ("democratização", "democratizando") são **defensáveis
apenas** se a palavra "democratização" vier acompanhada de "prova de conceito" e das hipóteses
declaradas — caso contrário a banca cobra dados de exclusão digital, custo e usabilidade que hoje não
existem. **Prefira mover "democratização" para a justificativa** (a *motivação* do trabalho) e deixar o
título na **contribuição técnica comprovável** (local-first / soberania de dados).

---

## 10. Como isto vira slides e plano

- **Deck de defesa (~18 slides, 15–20 min):** ver [`SLIDES_TCC_CASAI.md`](SLIDES_TCC_CASAI.md) — cada
  slide com bullets, roteiro do apresentador e visual sugerido (referenciando os screenshots reais),
  marcações `[CITAR FONTE]` e `[PENDENTE]`, e um slide-reserva de perguntas prováveis.
- **Plano de ação para a defesa (2–3 semanas):** ver [`PLANO_ACAO_TCC.md`](PLANO_ACAO_TCC.md) — tabela
  priorizada (Crítico/Importante/Desejável), roteiro de validação das 4 métricas, lista de referências
  a buscar (IBGE/CETIC/LGPD/WCAG/Whisper), e plano B de demonstração ao vivo.

**Regra de ouro:** apresente como **estrela** o que está provado (Tapo P110 via KLAP, latências
201–332 ms) e como **código + limitação declarada** o que não está (EWS 410, custo, inclusão). A
honestidade é parte do método — e, neste trabalho, é também a melhor estratégia de defesa.
