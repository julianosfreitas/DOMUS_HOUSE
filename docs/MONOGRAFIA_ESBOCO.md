# Esboço completo — Monografia CASAI (v0.8)

> Espelho estruturado de `CASAI_TCC_Monografia_v0.8.docx`.
> **Título:** *CASAI: uma arquitetura local-first e de baixo custo para a
> democratização da automação residencial no Brasil.*
> Juliano Freitas de Albuquerque Bezerra · Faculdade Nova Roma · Recife, 2026.
> Orientador: Prof. André Melo · Coorientador: Prof. Henning Summer.

## Tese central

A democratização da casa inteligente depende **menos do preço do hardware** e
**mais da redução da barreira de comissionamento**. O barateamento já ocorreu nos
dispositivos Wi-Fi genéricos (plataforma Tuya); o obstáculo decisivo é a
**complexidade técnica** de instalar e conectar — agravada por dependência de
nuvem e apps proprietários. Princípio operacional: **"nuvem uma vez, local para
sempre"**.

## Histórico de versões (apêndice de controle)

| Versão | Data | Marco |
|--------|------|-------|
| v0.1 | 02/2026 | Tema, problema, pergunta norteadora |
| v0.2 | 03/2026 | Fundamentação + relacionados; HA; controle vs. comissionamento |
| v0.3 | 04/2026 | Arquitetura; validação local Tapo P110 via KLAP (latências) |
| v0.4 | 05/2026 | Tuya Cloud 8/8; reposicionamento p/ democratização via comissionamento |
| v0.5 | 06/2026 | Qualificação: ABNT consolidada; protocolo de avaliação (voz, usabilidade, BOM) |
| v0.6 | 06/2026 | Dados de mercado Brasil×mundo; Matter/OpenHAB; hub como barreira; appliance futuro; título ajustado |
| v0.7 | 06/2026 | Retenção mínima de transcrições (purga); atualização de segurança do appliance; custo Wi-Fi vs. Matter; citação do repo |
| v0.8 | 06/2026 | Prazos de retenção (transcrição apagada já; auditoria ≤24h); mecanismo de atualização aberto e federável |

## Resumo / Abstract

PoC de hub local-first, voz pt-BR processada no próprio hub, remove barreira de
comissionamento. Métodos: desenvolvimento orientado a especificações + padrão
**Adapter** contra fragmentação. Resultados parciais: controle local Tapo P110 via
**KLAP** (latências **201–332 ms**); adapter de nuvem Tuya validado **8/8**. Custo,
acurácia de voz e acessibilidade = hipóteses a validar. Conclusão parcial:
viabilidade técnica do controle local por voz pt-BR sem nuvem; usabilidade =
trabalho em andamento.

**Palavras-chave:** automação residencial; local-first; soberania de dados;
reconhecimento de voz; acessibilidade; IoT.

---

## 1 INTRODUÇÃO

- Casa inteligente é produto de prateleira, mas concebida com dependência de nuvem,
  lock-in de ecossistema e instalação que exige letramento digital → exclusão.
- **Mercado:** ~US$ 2,7 bi no Brasil em 2024, ~10% a.a. até 2033 (IMARC, 2025);
  expansão ~30% a.a. no país vs. ~12% global (IDC, 2024); ~17 mi devices Alexa BR.
- **Penetração baixa e desigual:** domicílios com device inteligente 14,3% (2022) →
  16,4% (2024) (IBGE); EUA/UK ~44%, média mundial ~33% (Statista, 2023); urbano
  17,1% vs. rural 7,5%; Sul 19,8% vs. Nordeste 11,2%.
- **Duas barreiras estruturais:** custo e baixo conhecimento técnico. Distinção-chave:
  Wi-Fi genérico **já barato**; hardware padronizado (Matter) **ainda caro/escasso**
  no baixo custo BR → caminho acessível passa pelo Wi-Fi barato → complexidade técnica
  é o obstáculo decisivo.
- **Conectividade significativa** (CETIC.br, 2024): só 22% têm conexão satisfatória;
  73% classe A vs. 3% classes D/E.
- **Transição demográfica:** 65+ = 10,9% (2022, era 4,0% em 1980); 60+ = 15,6%.
  Idosos se beneficiam de voz mas têm menor familiaridade digital.
- **Privacidade:** modelos comerciais transmitem áudio/hábitos a terceiros; LGPD
  (minimização, finalidade) tensiona o modelo.

### 1.1 Problema de pesquisa
Obstáculo central não é preço (já acessível) mas **complexidade de instalar,
conectar e operar**, agravada por nuvem e apps proprietários. *Como tornar a
automação acessível a usuário não técnico, preservando privacidade e funcionamento
sem dependência permanente de nuvem?*

### 1.2 Pergunta norteadora e hipótese
Pergunta: é viável um sistema funcional, por voz pt-BR, local-first, hardware barato,
**comissionável por usuário não técnico** sem app do fabricante e sem portais de
desenvolvedor? **Hipótese:** democratização depende da redução da barreira de
comissionamento, não do custo do hardware.

### 1.3 Objetivos
- **Geral:** demonstrar viabilidade técnica de hub local-first, barato, por voz pt-BR,
  com comissionamento que reduza a barreira de acesso.
- **Específicos:** (1) arquitetura que isole heterogeneidade de protocolos; (2) voz
  pt-BR no hub sem áudio à nuvem; (3) validar controle local de hardware real
  (latência + confiabilidade); (4) mecanismo de comissionamento sem app/portais;
  (5) protocolo de avaliação (custo, acurácia de voz, energia, usabilidade).

### 1.4 Justificativa
Convergência necessidade social (desigualdade + envelhecimento) × lacuna técnica.
HA resolve controle mas pressupõe pareamento prévio pelo app do fabricante. A
contribuição está no **comissionamento acessível e local**.

### 1.5 Organização
7 capítulos: Fundamentação (2), Relacionados (3), Materiais e Métodos (4),
Desenvolvimento (5), Resultados (6), Considerações finais (7).

## 2 FUNDAMENTAÇÃO TEÓRICA

- **2.1** Automação residencial e IoT — custo percebido e complexidade são barreiras
  (Basarir-Ozel et al., 2022).
- **2.2** Fragmentação de protocolos e hubs como camada de integração.
- **2.3** Software local-first (Kleppmann et al., 2019) — usuário dono dos dados;
  nuvem = conveniência, não requisito.
- **2.4** STT e processamento local — Whisper (Radford et al., 2022), roda em hardware
  modesto sem GPU; transcreve no hub, dispensa áudio à nuvem.
- **2.5** Acessibilidade e idosos — voz como porta de entrada (Pradhan et al., 2020;
  Gonçalves et al., 2017).
- **2.6** Segurança, privacidade e LGPD — vulnerabilidades IoT (Ling et al., 2017;
  Yuan et al., 2023); Lei 13.709/2018.
- **2.7** WCAG — auditar acessibilidade da PWA (alvo de toque, contraste, cor).
- **2.8** Matter (CSA, 2022) — estado da arte do comissionamento (QR, IP local), mas
  caro/escasso no baixo custo BR.

## 3 TRABALHOS RELACIONADOS

- **3.1** Alexa/Nest/SmartThings — NLU maduro, ampla compatibilidade, **nuvem
  obrigatória** + perfilamento + descontinuação remota. CASAI não disputa
  inteligência linguística, e sim operação local + soberania.
- **3.2** Home Assistant — concorrente local maduro; **faz** comissionamento local de
  rádio (Zigbee/Z-Wave/Matter/ESPHome) sem app do fabricante. **Limites p/ o
  público-alvo:** (a) custo/montagem de hardware extra (dongles USB, border router);
  (b) varejo barato BR é **Wi-Fi/Tuya**, onde comissionamento local sem nuvem/app
  é problema mal resolvido; (c) instalar/configurar o próprio HA exige letramento
  técnico. Recorte do CASAI: comissionar e controlar Wi-Fi barato com mínima barreira.
- **3.3** Matter como estado da arte; CASAI **complementar, não concorrente** —
  enquanto parque instalado barato não migra. Cita **OpenHAB** (mesmas virtudes e
  exigências do HA).
- **3.4** Síntese — **Quadro 1**, 6 eixos:

  | Eixo | Alexa/Nest | SmartThings | Home Assistant | CASAI |
  |------|-----------|-------------|----------------|-------|
  | Funciona sem nuvem | Não | Não | Sim | Sim |
  | Soberania dos dados | Baixa | Baixa | Alta | Alta |
  | Comiss. local de rádio (Zigbee/Matter) | Não | Parcial | Sim | — |
  | Comiss. de Wi-Fi barato sem app | Não | Não | Limitado | Em validação |
  | Voz pt-BR no próprio hub | Não | Não | Parcial | Sim |
  | Sem mensalidade / sem lock-in | Não | Parcial | Sim | Sim |

## 4 MATERIAIS E MÉTODOS

- **4.1** Pesquisa aplicada, exploratória/descritiva; ciência de projeto (constrói +
  avalia artefato).
- **4.2** Desenvolvimento orientado a especificações (spec antes do código;
  rastreabilidade; testes).
- **4.3** Padrão **Adapter** (Gamma et al., 1994) como mecanismo metodológico contra
  fragmentação: interface única (ligar/desligar/brilho/cor/ler estado+energia) +
  adaptador por protocolo; núcleo extensível sem reescrita.
- **4.4** Tecnologias: monorepo hub + web. Hub = **TypeScript + NestJS + PostgreSQL +
  Whisper local**; interface = **PWA Next.js** instalável.
- **4.5** Critérios de sucesso + instrumentos:
  1. **Custo** < R$ 200 — BOM datada, 2 cenários (incremental e completo).
  2. **Acurácia de voz** — corpus rotulado pt-BR, WER, matriz de confusão por intenção,
     acurácia ponta-a-ponta.
  3. **Latência** — comando→resposta, por percentis.
  4. **Usabilidade/acessibilidade** — teste público-alvo (n=3–5), tarefas observadas,
     sucesso, tempo, escala **SUS**, consentimento informado.

## 5 DESENVOLVIMENTO DO CASAI

- **5.1** Visão geral — hub (lógica) + PWA (interface/voz); tudo na LAN, via API +
  canal de tempo real.
- **5.2** Adapter na prática — adaptadores Tapo, Tuya local, Tuya nuvem, Home Assistant
  + simulação; fábrica seleciona por tipo; credenciais decifradas só em memória; fila
  de comandos por dispositivo (1 conexão por vez).
- **5.3** Voz no hub — porta abstrata; Whisper fixo pt-BR; capta trecho → transcreve →
  **descarta áudio** → intenção estruturada (variações coloquiais); ambiguidade pede
  confirmação. Descarte verificável no código (minimização).
- **5.4** Comissionamento acessível — **"nuvem uma vez, local para sempre"**. Tapo P110
  = forma plena (credenciais de **consumidor**, não dev → controle local). Tuya =
  mesmo princípio via projeto de nuvem mantido pelo sistema; forma plena Tuya é o
  **principal trabalho de engenharia em curso**.
- **5.5** Apoio — painel de energia (custo em R$), cenas, rotinas por horário,
  engajamento; auth por token de sessão, anti-enumeração, isolamento por usuário.
- **5.6** Segurança/privacidade — credenciais **AES-GCM**; áudio descartado já;
  **retenção mínima do texto: transcrição apagada imediatamente após interpretar+executar;
  log de auditoria reduzido (sem conteúdo do comando) por ≤24h, expurgo diário
  automático**. Defende contra superfície de metadados ("ligar o cofre").
- **5.7** Implantação — demo pública em infra de custo nulo (serviços gratuitos);
  **sem controle de hardware físico remoto** (servidor não alcança a LAN) → demo
  pública em modo simulado/nuvem; hardware real só na instalação local.
- **5.8** **Hub como barreira atual + caminho do appliance** — instalar runtime+banco
  exige letramento técnico, é barreira tão grande quanto parear no app. Solução =
  distribuir hub como **appliance pré-configurado** (imagem em cartão/dispositivo
  plug-and-play) → **trabalho futuro**. Paradoxo de segurança: IoT sem updates vira
  vetor de invasão → **exceção legítima** ao "local para sempre": appliance busca e
  aplica **updates de segurança assinados** automaticamente. Para não reintroduzir
  dependência proprietária, o mecanismo deve ser **aberto e federável** (repo público,
  espelhável pela comunidade).

## 6 RESULTADOS E DISCUSSÃO

- **6.1** Artefato — sistema funcional, versionado, cobertura ~**80%**, CI (lint,
  testes, auditoria de deps, varredura de segredos); implantado e demonstrável.
- **6.2** **Controle local Tapo P110 (KLAP)** — resultado mais sólido: on/off com
  sucesso, latências **201 ms** e **332 ms**. Erro explícito em indisponibilidade
  ⇒ sucesso comprova comunicação real (afasta simulação silenciosa). Sequências
  estáveis. Validade interna: latências refletem também a rede; protocolo prevê
  repetição com topologia + percentis (p50/p95).
- **6.3** **Controle via nuvem Tuya** — adapter **8/8** (on, off, brilho 3 níveis,
  temperatura de cor, cor), todas com leitura de confirmação. Ressalva: contra device
  que expõe **o mesmo modelo de dados** da lâmpada física-alvo, **não** a lâmpada
  física; controle físico local da lâmpada = etapa subsequente.
- **6.4** Estado dos critérios — **Quadro 2**:

  | Critério | Estado | Observação |
  |----------|--------|-----------|
  | Latência | Parcial | Tapo 201–332 ms; agregação da latência de voz pendente |
  | Acurácia de voz | A coletar | Infra de log existe; corpus/WER/matriz pendentes; índice de confiança ≠ acurácia |
  | Custo | A consolidar | BOM em elaboração (2 cenários, inclui hub); devices ~**R$ 180** |
  | Usabilidade | A coletar | Protocolo definido (n=3–5, SUS); coleta pendente |

- **6.5** Discussão — viabilidade técnica sustentada (Tapo + arquitetura). Tese
  apoiada pelo caminho Tapo (credenciais de consumidor → controle local). Generalização
  Tuya projetada mas não demonstrada em hardware. **Não autorizado afirmar:**
  acessibilidade (falta SUS) e economia de energia (falta leitura real) = hipóteses.
  Voz: pt-BR é alto recurso p/ Whisper, mas degrada 5–15 pp sob ruído e mais em
  modelos pequenos (que um hub barato roda) → tensão real custo × acurácia, a medir.

## 7 CONSIDERAÇÕES FINAIS

- Reafirma tese; etapa de qualificação demonstrou viabilidade técnica do controle
  local sem nuvem (Tapo sólido + Tuya 8/8).

### 7.1 Limitações
- Comissionamento da **lâmpada Wi-Fi não concluído em hardware** (provisionamento).
- "Local-first" hoje = caminho primário por configuração + aviso em falha, **não**
  contingência automática para nuvem.
- Instalar o **hub é barreira técnica** relevante.
- Acessibilidade e custo = hipóteses pendentes.
- Adaptadores de hardware sem testes unitários dedicados.

### 7.2 Trabalhos futuros
Experimento de voz (corpus pt-BR, múltiplos falantes, ruído, WER/matriz/latência por
percentis); coleta de energia com medidor real; BOM comparativa (incremental +
completo, c/ hub); teste de usabilidade com público-alvo; **transformar hub em
appliance plug-and-play** (condição da democratização plena); concluir comissionamento
da lâmpada Wi-Fi em hardware; horizonte = comissionamento **integralmente local** sem
nuvem.

## REFERÊNCIAS (principais)

Basarir-Ozel, Turker, Nasir (2022) · Bezerra (2026, repo
github.com/julianosfreitas/casai_tcc) · Brasil, Lei 13.709/2018 (LGPD) · CETIC.br
(2024) · CSA, Matter (2022) · Gamma et al. (1994) · Gonçalves et al. (2017) · Home
Assistant (2026) · IMARC (2025) · IBGE (Censo 2022; PNAD TIC 2024) · Kleppmann et al.
(2019) · Ling et al. (2017) · openHAB Foundation (2025) · Pradhan et al. (2020) ·
Radford et al. (2022, Whisper) · Statista (2023) · W3C WCAG 2.1 (2018) · Yuan et al.
(2023).
