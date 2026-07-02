# Análise Crítica Geral — DOMUS/CASAI × Monografia (jul/2026)

> Gerada por análise multi-agente (4 leitores de subsistema + 4 críticos independentes:
> banca, UX, design, orientador + síntese). Fonte de decisão até a defesa.

---

## 1. A DOR (formulação recomendada para o §1.1)

No Brasil, o hardware de automação residencial já é barato — uma lâmpada ou tomada
Wi-Fi genérica (ecossistema Tuya) custa entre R$30 e R$60 no varejo —, mas transformar
esse hardware em automação utilizável permanece inacessível ao domicílio típico
brasileiro por três barreiras encadeadas:

1. **Comissionamento.** Cada dispositivo exige aplicativo proprietário do fabricante,
   criação de conta em nuvem e, para qualquer forma de controle local, o uso de portais
   de desenvolvedor em inglês e ferramentas de linha de comando — um custo de letramento
   digital que exclui exatamente quem mais se beneficiaria da tecnologia. O resultado é
   visível nos dados: penetração de automação residencial de 16,4% dos domicílios
   (IBGE, 2024), contra ~44% nos EUA e Reino Unido, com corte regional (Nordeste 11,2%
   vs Sul 19,8%) e de renda.
2. **Dependência estrutural de nuvem.** O funcionamento cotidiano fica refém de uma
   conectividade satisfatória em apenas 22% dos domicílios brasileiros (CETIC.br, 2024;
   73% na classe A vs 3% nas classes D/E) e da continuidade dos servidores do
   fabricante — a casa "inteligente" deixa de funcionar quando a internet cai ou o
   serviço é descontinuado.
3. **Privacidade.** O envio contínuo de áudio e hábitos domésticos a servidores de
   terceiros tensiona os princípios de minimização e finalidade da LGPD
   (Lei nº 13.709/2018), num país que envelhece (10,9% com 65+, IBGE 2022) e cujos
   idosos — que mais se beneficiam de interfaces de voz — são os mais expostos.

**A dor não é o preço de compra do dispositivo: é o custo de comissionamento e a
dependência estrutural de nuvem que separam o hardware barato da automação utilizável.**

Hipótese falsificável derivada: *é tecnicamente viável comissionar e controlar
localmente, sem aplicativo do fabricante e sem portais de desenvolvedor, dispositivos
Wi-Fi genéricos de baixo custo, com comandos de voz em pt-BR processados integralmente
no hub, a custo incremental total inferior a R$200* — verificável dispositivo a
dispositivo (Tapo P110: confirmada; Tuya EWS 410: em validação).

---

## 2. Estado geral (diagnóstico)

Engenharia acima da média para TCC: NestJS com adapter pattern rigoroso (5 adapters),
AES-256-GCM, cobertura 88,1%, PWA polido, 138 comandos de voz reais instrumentados,
10.969 leituras de energia no banco. Capital raro de honestidade documental
(autoavaliação 5,5/10, post-mortem do device virtual Tuya, Quadro 2 com status real).

**O risco da defesa não está no código: está na distância entre o que a monografia
promete e o que foi medido e sincronizado.**

- 3 dos 4 critérios de sucesso do §4.5 nunca foram coletados (WER/corpus, custo/BOM,
  SUS de usabilidade).
- A contribuição-título — comissionamento sem app do fabricante e sem portal — só está
  demonstrada no caminho Tapo; a EWS 410 nunca foi controlada em hardware e o fluxo
  Tuya atual contradiz a promessa na própria UI.
- Números reais ficam na margem dos alvos informais: intenção 87,7% vs 88%;
  p95 2.140ms vs 2s.
- Cadeia documental dessincronizada: deck na era CASAI, política de privacidade §5.6
  não implementada no código, história da demo MOCK/física inconsistente.

Defesa **viável na forma fraca** da tese (viabilidade demonstrada) e **indefensável na
forma forte** (democratização realizada). Próximas semanas: 100% coleta de métricas e
alinhamento documental, zero features visuais novas.

---

## 3. Desalinhamentos código ↔ monografia (e correções)

1. **§5.6 (privacidade) vs código.** Texto promete apagar transcrição após execução e
   expurgar logs em ≤24h; não há nenhum cron/deleteMany sobre voice_commands — as 138
   transcrições persistem desde 18/06 e sustentam as métricas do Cap. 6.
   → Ajustar o TEXTO: "retenção configurável; durante o estudo, mantida habilitada
   mediante consentimento informado (LGPD art. 7º) para viabilizar coleta de métricas";
   expurgo automático vira trabalho futuro.
2. **Claim "sem app do fabricante / sem portal"** contradita no caso Tuya: onboarding
   exige local_key + Device ID via portal Tuya IoT e a UI manda instalar tuya-cli via
   npm (`_shared.tsx:224`). → Reescrever com precisão: forma plena DEMONSTRADA no
   caminho Tapo (credenciais de consumidor → controle local KLAP); Tuya = gap
   caracterizado + harness pronto (`spikes/ews410-bootstrap.cjs`), "Em validação" no
   Quadro 1 + limitação em §7.1; na UI, mover local_key para "Configuração avançada".
3. **Alvos numéricos inconsistentes.** "≥88% / <2s" só existem no CLAUDE.md e slides;
   §4.5 não os fixa. Dados reais: intenção 87,7%, execução 66,7%, p95 2.140ms.
   → Padronizar pela monografia; separar acurácia de INTENÇÃO, sucesso de EXECUÇÃO
   (dominado por hardware offline, não pelo parser) e WER (a coletar); latência por
   p50/p95 com discussão de outliers (máx 12,3s = timeout de hardware).
4. **Custo diverge:** ~R$130 (CLAUDE.md) vs ~R$180 (README/Quadro 2). → BOM única
   datada, com links/notas fiscais, 2 cenários: "incremental" (PC reaproveitado como
   hub) e "completo" (mini-PC/RPi) — enfrentando o custo do hub explicitamente.
5. **História da demo inconsistente.** v0.9 abole MOCK; render.yaml tem
   DEMO_MODE=true; DEPLOY.md diz que demo pública "usa MOCK"; demo-data.ts semeia
   devices físicos SEM credenciais (comandos falham na nuvem). → História única:
   demo pública = interface + fluxo de voz sem hardware, com aviso na UI; defesa ao
   vivo = hub local com Tapo real; vídeo de backup como plano B.
6. **Deck de slides na era CASAI** (título antigo, screenshots pré-v0.9, plano B com
   MOCK abolido). → Reescrever POR ÚLTIMO, após métricas e monografia.
7. **Scope creep sem lastro:** gamificação (pesos 15/25/30/20 sem literatura), Google
   OAuth, Voicebox TTS (só aceita en|zh — nem serve ao pt-BR!), earcons, 5º adapter
   HA. → Subseção única no Cap. 5: "recursos de produto voltados a engajamento e
   demonstração, fora do escopo científico"; tirar Voicebox da narrativa de voz;
   adapter HA como confirmação do adapter pattern (coerente com ADR-001).
8. **"Local-first" ≠ literatura** (Kleppmann et al.); não há fallback automático
   local→nuvem. → Definir formalmente no Cap. 2 o que significa no DOMUS (plano de
   controle — Whisper, adapters, chaves, dados — só existe na instalação local; nuvem
   hospeda só a vitrine). Preparar resposta de 30s para a banca.
9. **Promessas sem implementação utilizável:** economia "antes/depois" sem dado útil
   (10.969 leituras ≈ 0,45W, tomada sem carga); tarifa 0,92 R$/kWh hardcoded; Rooms e
   Users sem controller; trigger DEVICE_STATE retorna true silenciosamente.
   → Plugar carga real na Tapo JÁ (≥5 dias de série) ou rebaixar para "painel
   demonstrado; economia não avaliada"; restante vira limitação declarada em §7.1.
10. **Divergências menores:** CLAUDE.md cita snake_case, schema Prisma usa PascalCase
    sem @@map; IP do Tapo no seed (.64) defasado (observado .68);
    EWS410-fresh-start.md:144 nega device TUYA no banco mas existe placeholder.
    → Revisar antes do ensaio geral.

---

## 4. Mudanças na monografia

1. **§1.1:** adotar a formulação da dor acima, hierarquizando comissionamento >
   nuvem > privacidade; custo de compra é premissa, não problema.
2. **Hipótese:** rebaixar de alegação socioeconômica não-falsificável para claim de
   viabilidade falsificável por dispositivo (texto na seção 1). Comparação entre
   barreiras vira justificativa, não hipótese testada.
3. **Título:** manter "…PARA a democratização" é defensável SE a Introdução declarar
   que o título é direcional. Alternativa mais segura: "DOMUS: uma arquitetura
   local-first de baixo custo para comissionamento e controle de dispositivos Wi-Fi
   sem dependência permanente de nuvem". Ensaiar a defesa de 30s.
4. **§4.5:** fixar por escrito alvos e métricas — WER (corpus ≥50 enunciados, ≥3
   falantes, matriz de confusão), acurácia de intenção, sucesso de execução e latência
   p50/p95 são QUATRO números diferentes. Incluir "modo de avaliação" (retenção
   temporária com consentimento, expurgo ao final).
5. **§5.6:** reescrever como retenção configurável (protege as 138 amostras).
6. **Cap. 2:** definição operacional de "local-first" (ou termo "controle local
   primário"), citando §7.1 proativamente.
7. **Cap. 5:** subseção "Recursos de produto" (gamificação, Google Sign-In, Voicebox,
   earcons, demo mode); justificar adapter HA; 2 linhas sobre DEMO_MODE.
8. **Cap. 6:** números reais (p50 463ms / p95 2.140ms, intenção 87,7%, execução
   66,7%, outlier 12,3s) + coletados na semana de métricas; ressalva "Tuya 8/8" =
   device VIRTUAL; alucinação do Whisper ("[Som de futebol]") como evidência nas
   limitações; **EWS 410 travada reenquadrada como EVIDÊNCIA EMPÍRICA da tese** — a
   barreira de comissionamento é real a ponto de bloquear até o autor.
9. **§7.1:** ampliar limitações — energia sem série com carga, Rooms/Users sem
   endpoint, adapters físicos fora da cobertura por design, retenção LGPD suspensa.
10. **Gerar DOMUS_TCC_Monografia_v0.9.docx** (não existe no repo) DEPOIS das métricas;
    slides por último.

---

## 5. Mudanças de UX (priorizadas)

1. **DECISÃO hero vs voz-first: manter /voz como start_url. NÃO criar hero de
   marketing no app.** Hero é padrão de landing de aquisição — quem instalou o PWA já
   foi convertido; seria atrito a cada abertura. A contribuição científica (voz local
   pt-BR) merece a primeira tela; o orbe reativo ao RMS já É o hero. Complemento
   mínimo: tela de pre-permission ("Ativar microfone" + "seu áudio nunca sai do hub")
   antes do prompt nativo (padrão Apple HIG) + start condicional: 0 dispositivos →
   /dispositivos/add. (~2-3h, na fase de robustez.)
2. **[CRÍTICO, ~3 linhas]** Ocultar VoiceFab quando `pathname === '/voz'`
   (`app-shell.tsx:151`): hoje dois capturadores de microfone (VAD contínuo vs 3s
   fixos) disputam getUserMedia na mesma tela — receita para falha ao vivo na banca.
   Melhor razão impacto/esforço do frontend.
3. **[Alto, 2-3h]** Fallback de comando por TEXTO na /voz: `api.voiceCommandText`
   existe (`lib/api.ts:190`) mas nenhuma UI usa. Campo "Ou digite um comando" no
   estado blocked + ícone de teclado — salva a demo se o microfone falhar e rende
   parágrafo de acessibilidade na monografia.
4. **[Alto, meio dia]** Banner global "Hub inacessível — verifique a rede local" +
   estado de erro nos stat-cards: hoje nenhuma query renderiza isError; /inicio mostra
   0W/R$0,00 como dado válido — contradiz o princípio "se quebrar, o sistema avisa".
   Corrigir vira argumento de defesa.
5. **[Alto, ~2h]** UI de cadastro Tuya honesta: local_key/Device ID/tuya-cli para
   "Configuração avançada" recolhida, rótulo "em validação"; demo roteirizada pelo
   caminho Tapo + discover automático.
6. **[Médio, 30min]** Service worker: SHELL pré-cacheia '/dashboard' (rota extinta,
   `sw.js:12`), não inclui /voz nem /inicio. Trocar por
   `['/', '/voz', '/inicio', '/login', '/manifest.webmanifest', '/icon.svg']` + bump
   de versão + testar PWA em modo avião. Splash mínimo na rota / (hoje null = flash
   branco).
7. **[Pós-defesa]** Agrupar widgets por cômodo; Conquistas → AccountMenu; tab bar
   inferior mobile; CRUD de Rooms; Radix Dialog no lugar de window.confirm; controle
   de cor no DeviceWidget (sobe para pré-defesa APENAS se a EWS 410 parear — "mudar a
   cor da luz por voz" seria a demo mais impressionante).

---

## 6. Mudanças de design (veredito liquid glass)

1. **VEREDITO:** liquid glass É compatível com o tema monocromático — vidro é
   MATERIAL, não cor (translucidez neutra + blur + borda hairline + saturate, sem
   violar anti-neon). MAS não fazer redesign agora: com 3 de 4 métricas não coletadas,
   vidro não muda nota de banca. Se sobrar tempo, SOMENTE pacote mínimo (≤1 dia)
   restrito ao chrome (como a HIG 2025 prescreve):
   - `--glass-bg: rgb(255 255 255 / 0.80)` light / `rgb(10 10 10 / 0.72)` dark
     (pisos WCAG — nunca menos)
   - `--glass-border: rgb(0 0 0 / 0.08)` light / `rgb(255 255 255 / 0.10)` dark
   - `.material-glass { backdrop-filter: blur(20px) saturate(1.5); }` + borda 1px +
     `box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06)`
   - APENAS em header, VoiceFab, dropdowns, anel do orbe — NUNCA em cards roláveis
     (backdrop-filter + re-render a cada energy:reading de 5s = jank em Android de
     entrada, justamente o público da tese)
   - Fallback `@supports not (backdrop-filter)` → background sólido; validar com axe.
2. **[Quick-win 15min — fazer mesmo sem glass]** Elevação do dark mode: `--card`
   #0a0a0a idêntico ao background, cards "somem". Trocar `.dark`:
   `--card: #141416`, `--border: rgb(255 255 255 / 0.08)`, rim light
   `inset 0 1px 0 rgb(255 255 255 / 0.05)`. Maior distância atual para "cara Apple".
3. **[30min]** `font-variant-numeric: tabular-nums` em todos os números (W, kWh, R$,
   ms) + hierarquia tipográfica (valores text-3xl font-semibold, títulos
   tracking-[-0.02em]). Cara Apple = tipografia + resposta física, não vidro.
4. **[1h, opcional]** Haptics visuais: `active:scale-[0.97]` +
   `transition-transform duration-150 ease-out` em Button, Switch, FAB.
5. **[15min]** GradientBackground: blob `--destructive` (vermelho decorativo — viola
   tema) → `--chart-1` stopOpacity 0.3; opacidade do wrapper 0.60 → 0.25-0.30.
6. **Login glassmorphism (~10KB ornamental em sign-up.tsx):** NÃO reescrever antes da
   defesa (é a tela de entrada da banca; risco de regressão). Pós-defesa: unificar ao
   .material-glass. Exceção barata: condicionar botão "Entrar como demonstração"
   (credenciais hardcoded visíveis) a `NEXT_PUBLIC_DEMO_MODE` (~30min).
7. **Hero apenas para a DEMO PÚBLICA (Vercel), se sobrar tempo:** tipográfico à la
   apple.com — fundo #0a0a0a, headline text-5xl/6xl tracking-[-0.03em] com slogan
   ("A nuvem, uma vez. A casa, para sempre."), UM CTA, screenshot em moldura
   border-white/10 rounded-2xl shadow-2xl, sem aurora colorida.

---

## 7. Plano priorizado até a defesa

**SEMANA 1 — Coleta de métricas (maior ROI):**
- (a) DIA 1, primeiro ato: plugar carga real (ventilador/abajur) na Tapo P110 com
  rotina de desligamento noturno — precisa de ≥5-7 dias de série "antes/depois".
- (b) SUS n=3-5 com roteiro de 5 tarefas (1 tarde — critério mais barato).
- (c) Corpus de voz ≥50 enunciados, ≥3 falantes, WER + matriz de confusão;
  138 comandos reais como "coleta em uso" (1 dia).
- (d) BOM datada, 2 cenários incluindo hub (3h).
- (e) Query SQL de percentis sobre voice_commands → latência p50/p95 (1h).
- Em paralelo: **gravar vídeo de backup da Tapo** (voz → tomada liga → latência no
  log) ANTES que o IP DHCP mude (2h); reserva DHCP no roteador (banco tem .64,
  observado .68).

**SEMANA 1-2 — Timebox ÚNICO de 4h na EWS 410** (runbook EWS410-fresh-start.md,
conta SmartLife nova, harness pronto; checar `netstat -rn | grep '!'` antes —
Tailscale). Funcionou = evidência da forma forte. Não funcionou = abandonar sem culpa;
bloqueio vira evidência da barreira no Cap. 6. NUNCA tentar ao vivo na banca.

**SEMANA 2 — Monografia v0.9.docx (2-3 dias):** dor §1.1, hipótese rebaixada, §4.5
fixado, §5.6 reescrito, claim Tapo/Tuya precisa, local-first no Cap. 2, "recursos de
produto" no Cap. 5, Cap. 6 com números reais, §7.1 ampliado, BOM unificada.

**SEMANA 2-3 — Robustez da demo (1 dia de código):** VoiceFab oculto em /voz,
fallback de texto, banner hub inacessível, fix sw.js + teste modo avião, local_key →
avançado, pre-permission de microfone. Checklist: roteador/hotspot PRÓPRIO, rotina
anti-Tailscale, Whisper testado SEM internet, não rodar reseed na máquina da demo,
vídeo de backup no notebook E celular, acordar Render 15min antes, ensaio geral 48h
antes na configuração exata.

**SEMANA 3 — Deck novo POR ÚLTIMO (1 dia):** título DOMUS, screenshots atuais, slide
de hipóteses com números reais, plano B = vídeo (nunca MOCK); sincronizar
DEPLOY.md/render.yaml/demo-data.ts com história única.

**SE SOBRAR TEMPO (ordem):** dark elevation 15min → tabular-nums 30min → haptics 1h →
blob vermelho 15min → PATCH /users/me energyRate 1h → botão demo atrás de env 30min →
pacote glass mínimo ≤1 dia. **NÃO fazer:** redesign completo, hero no app,
onboarding-tour, testes de adapters físicos, features novas.

---

## 8. Riscos e mitigações

| # | Risco | Mitigação |
|---|-------|-----------|
| 1 | EWS 410 não parear no timebox | Demo ancorada na Tapo + vídeo; bloqueio vira evidência empírica no Cap. 6; nunca ao vivo |
| 2 | Banca ataca métrica na margem (87,7% < 88; p95 2.140ms > 2s) | Alvos não existem no §4.5 — padronizar pela monografia, percentis, honestidade |
| 3 | Microfone falha no auditório (Whisper já alucinou 2×) | Fallback texto, VoiceFab removido, pre-permission, ensaio, vídeo |
| 4 | Rede da defesa (Tailscale reject, DHCP, Wi-Fi faculdade) | Hotspot próprio, reserva DHCP, netstat pré-demo, ensaio 48h antes |
| 5 | Demo pública quebrada (devices sem credenciais, botão demo exposto) | Teste ponta-a-ponta como banca, aviso na UI, acordar Render |
| 6 | "Democratização com n=1" | SUS n=3-5 semana 1 + parágrafo direcional; sem SUS → título alternativo |
| 7 | Contradição LGPD (§5.6 vs 138 transcrições) | Reescrever §5.6 ANTES de entregar — pergunta mais previsível da banca |
| 8 | Scope creep estético nas semanas finais | Congelamento visual declarado; rigor > demo > beleza |
| 9 | Documentos dessincronizarem de novo | Ordem estrita: métricas → monografia → código demo → slides; revisão única de consistência |
| 10 | Série de energia morrer por falta de tempo | Carga real no DIA 1; se não der, rebaixar explicitamente nas limitações |
