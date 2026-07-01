# CASAI — Deck de Defesa de TCC (~15–20 min)

> **Formato:** ~18 slides. Cada slide traz texto-de-slide (bullets), 🎤 roteiro do apresentador e 🖼️ visual.
> Marcações: `[CITAR FONTE]` = falta referência; `[PENDENTE]` = falta produzir/medir antes da defesa.
>
> **Screenshots reais disponíveis** em `docs/screenshots/`: `dashboard-dark/light`, `dev-1-form-tuya`,
> `dev-2-form-tapo`, `dev-3-lista-status`, `disc-1-resultado`, `mob-1..4`, `login-dark/light`.
>
> **Aviso honesto ao apresentador:** este deck foi calibrado para o estado **real** do código. Não
> prometa o que não está medido. O coração defensável é: **controle local provado da Tapo P110 +
> arquitetura local-first + soberania de dados.** Não defenda "democratização social ampla" como fato.

---

## Slide 1 — Capa

**Título:**
**CASAI: automação residencial local-first e de baixo custo com controle por voz em português — uma prova de conceito de soberania de dados doméstica**

- Aluno: [nome] · Orientador(a): [nome]
- Curso · Instituição · 2026
- Repositório / demo: PWA instalável (Render + Vercel + Neon)

🎤 **Fala:** "Bom dia. Vou apresentar o CASAI, uma prova de conceito de automação residencial que
funciona na rede local da casa, controlada por voz em português, sem depender de nuvem. O fio condutor
do trabalho é soberania de dados: a casa do usuário responde sem mandar a voz dele para a big tech."

🖼️ **Visual:** logo/ícone do app (`apps/web/public/icon-512.png`) sobre fundo escuro `#0a0a0a`; ao lado,
`docs/screenshots/dashboard-dark.png` em mockup de celular.

---

## Slide 2 — Roteiro da apresentação

- Problema e contexto
- Objetivo, hipótese e critérios de sucesso
- Trabalhos relacionados e diferencial
- Arquitetura (local-first, adapter, voz no hub)
- Demonstração ao vivo
- Resultados e métricas
- Limitações, ameaças à validade e trabalhos futuros

🎤 **Fala:** "A apresentação segue sete blocos. Vou ser transparente sobre o que está comprovado e o
que ainda é hipótese ou trabalho futuro — essa honestidade faz parte do método."

🖼️ **Visual:** lista numerada simples, ícone por bloco. Sem screenshot.

---

## Slide 3 — Problema e contexto

- Casa inteligente comercial pressupõe **nuvem obrigatória** e **mensalidade/ecossistema** de big tech
- Custo de entrada e dependência de conta na nuvem como barreiras de acesso `[CITAR FONTE: CETIC.br / TIC Domicílios]`
- Envelhecimento populacional e baixa familiaridade digital no Brasil `[CITAR FONTE: IBGE / PNAD Contínua]`
- Dados de voz e hábitos domésticos enviados a servidores de terceiros `[CITAR FONTE: LGPD — Lei nº 13.709/2018]`

🎤 **Fala:** "O problema tem três faces: custo e dependência de nuvem, exclusão de quem tem baixa
familiaridade digital, e privacidade dos dados domésticos. Vou ancorar esses três pontos em dados
brasileiros — IBGE, CETIC e a LGPD." `[PENDENTE: inserir os números reais antes da defesa — hoje não
há nenhum dado BR citado no projeto.]`

🖼️ **Visual:** 3 ícones (cifrão / pessoa idosa / cadeado-nuvem) com um número-âncora abaixo de cada
**[PENDENTE preencher com IBGE/CETIC]**. Não invente número.

---

## Slide 4 — Objetivo, hipótese e critérios de sucesso

- **Objetivo geral:** demonstrar a viabilidade técnica de um hub de automação residencial **local-first**, de baixo custo, com comando de voz **offline** em pt-BR
- **Hipótese:** é viável montar automação residencial funcional, local-first e por voz pt-BR com hardware de baixo custo, **sem o app do fabricante no caminho de controle**
- **4 critérios (CLAUDE.md §11):** acurácia de intenção ≥ 88 % · latência de voz < 2 s · economia de energia antes/depois · custo de hardware < R$ 200
- Cada critério está amarrado a um objetivo específico

🎤 **Fala:** "A hipótese é de viabilidade técnica, não de transformação social. Defini quatro critérios
objetivos. Vou ser direto: nem todos foram medidos até aqui — apresento o que provei e declaro o resto
como trabalho futuro. Isso é parte do rigor."

🖼️ **Visual:** tabela de 4 linhas (critério | meta | status) com ✅ medido / 🟡 parcial / ⛔ não medido.
**[PENDENTE: preencher status — hoje 3 dos 4 estão ⛔.]**

---

## Slide 5 — Trabalhos relacionados e diferencial

- **Alexa / Google Nest:** voz pt-BR superior, mas **nuvem obrigatória**, perfilamento e descontinuação remota possível `[CITAR FONTE: preço varejo BR Echo Dot / Nest Mini]`
- **Samsung SmartThings:** hub proprietário + nuvem Samsung `[CITAR FONTE]`
- **Home Assistant:** maduro em **controle**, mas integrações Tuya/TP-Link **pressupõem o app do fabricante para o pareamento** (`docs/RELATED_WORK_Home_Assistant.md`, verificação adversarial)
- **Diferencial do CASAI:** soberania de dados + sem nuvem/mensalidade + **commissioning local-first sem o app do fabricante**

🎤 **Fala:** "Não compito com a Alexa em inteligência de linguagem — ela é melhor nisso. Compito no
eixo onde ela estruturalmente perde: processar a voz localmente e não depender de nuvem. Contra o Home
Assistant, que também é local, meu diferencial é fechar o pareamento sem o app do fabricante. Esse gap
eu documentei com fontes oficiais."

🖼️ **Visual:** **tabela comparativa de 5 eixos** (custo do hub · dependência de nuvem · soberania de
dados · pt-BR offline · commissioning sem app do fabricante) × 5 colunas (Alexa · Nest · SmartThings ·
HA+RPi · CASAI). **[PENDENTE: produzir a tabela — hoje só o HA está documentado.]**

---

## Slide 6 — Arquitetura geral (visão local-first)

- Tudo roda **no hub** (notebook/mini-PC na casa): backend NestJS + PostgreSQL + Whisper
- PWA (Next.js) só captura voz e desenha a UI; **nenhum dado de controle sai para a nuvem**
- Voz: PWA grava ~3 s → `POST /voice/command` → Whisper transcreve **no hub** → áudio **descartado**
- Segurança: JWT global, segredos cifrados **AES-256-GCM**, escopo por usuário em todas as queries

🎤 **Fala:** "A arquitetura tem uma propriedade central: o caminho de controle e a transcrição de voz
acontecem dentro da rede da casa. O celular só manda o áudio para o hub local, que transcreve com o
Whisper e descarta o arquivo. Os segredos dos dispositivos ficam cifrados em AES-256-GCM."

🖼️ **Visual:** **diagrama de blocos** `[PENDENTE produzir]`: Celular(PWA) → LAN →
Hub(NestJS+Whisper+Postgres) → dispositivos (Tapo/Tuya). Setas marcando "áudio descartado" e "0
chamadas à nuvem no controle".

---

## Slide 7 — Padrão Adapter (o coração técnico)

- Interface única `DeviceAdapter` — `turnOn/Off/toggle/setBrightness/setColor/readState/readEnergy`
- **Factory por enum** `Protocol`; segredos descriptografados **só em memória** no uso
- **5 adapters concretos:** Tapo · Tuya LAN · Tuya Cloud · Home Assistant · **Mock**
- **Nenhum serviço/controller chama lib de IoT direto** → extensível a hardware barato heterogêneo
- `DeviceCommandQueue` serializa comandos por dispositivo (1 conexão Tuya por vez)

🎤 **Fala:** "Esse é o ponto mais forte de engenharia. Toda a complexidade de cada fabricante fica
isolada atrás de uma interface única. Adicionar um dispositivo novo não toca o núcleo. É isso que
sustenta a promessa de funcionar com hardware barato e variado — Intelbras, Tapo, o que for."

🖼️ **Visual:** **diagrama de classes simplificado** `[PENDENTE produzir]`: `DevicesService →
DeviceAdapter (interface) ← {Tapo, TuyaLAN, TuyaCloud, HomeAssistant, Mock}`. Evidência:
`device-adapter.factory.ts:35-53`.

---

## Slide 8 — Pipeline de voz pt-BR no hub

- STT desacoplado por **porta abstrata** `SpeechToText` → `WhisperSttService` (whisper.cpp/CPU, idioma fixo `pt`)
- Parser converte texto pt-BR em **intent estruturado** (`turnOn/turnOff/toggle/setBrightness/setColor`)
- Robusto a fala coloquial: normaliza acentos, cobre "desligua/apaga/acende", cores e "X por cento"
- **Ambiguidade → sugestões + confirmação** em vez de executar errado
- Degradação graciosa: sem a lib → 503 com orientação, fluxo por texto continua

🎤 **Fala:** "O reconhecimento de intenção é baseado em regras, não um modelo de linguagem grande — é
uma decisão consciente para rodar offline em CPU barata. Quando há dúvida, o sistema pergunta em vez de
chutar. Sou honesto: isso é menos poderoso que a Alexa, mas roda 100 % local."

🖼️ **Visual:** fluxo horizontal: 🎙️ "Liga a luz da sala" → Whisper → Parser → `intent: turnOn` → ação.
Pode usar `docs/screenshots/mob-2-dashboard.png` com o FAB de voz destacado.

---

## Slide 9 — Demonstração ao vivo (1/3): controle por voz + Tapo real

- Comando de voz em pt-BR → ligar/desligar tomada **Tapo P110 física**
- Controle **100 % na LAN** via protocolo KLAP — **sem nuvem no caminho**
- Confirmação por **voz (TTS pt-BR)** + atualização em tempo real (WebSocket)

🎤 **Fala:** "Vou ligar uma tomada real só falando. [executar] Repare que ela responde e o app confirma
por voz. Isso não passou por nenhuma nuvem — saiu do meu hub direto para a tomada na rede local."
`[PENDENTE: ensaiar e ter PLANO B gravado em vídeo — risco de rede lenta na banca; timeout de 5 s vira
erro 503 sem retry.]`

🖼️ **Visual:** **demo ao vivo** com a Tapo P110 física + tela do celular espelhada
(`docs/screenshots/dashboard-dark.png` como fallback). Ter vídeo de backup gravado.

---

## Slide 10 — Demonstração ao vivo (2/3): cadastro de dispositivos e descoberta

- Formulário guiado por protocolo (Tuya / Tapo) com texto de ajuda em pt-BR
- **Descoberta na LAN** (broadcast Tuya UDP + scan TCP + OUI por ARP) — sem API externa
- Lista de dispositivos com **status online/offline** real

🎤 **Fala:** "O cadastro é guiado pela própria interface. A descoberta varre a rede local procurando
dispositivos. Vou ser transparente: para a Tuya ainda é preciso obter uma chave local — esse é
justamente o gargalo que discuto nas limitações."

🖼️ **Visual:** sequência `docs/screenshots/dev-2-form-tapo.png` → `docs/screenshots/disc-1-resultado.png`
→ `docs/screenshots/dev-3-lista-status.png`.

---

## Slide 11 — Demonstração ao vivo (3/3): dashboard, rotinas e energia

- **Rotinas por horário** (cron validado antes de salvar; trata virada de meia-noite) e **cenas**
- **Dashboard de energia:** consumo em kWh → **custo em R$** (tarifa × kWh, projeção mensal)
- PWA **instalável sem loja**, mobile-first, pt-BR, tema claro/escuro

🎤 **Fala:** "Crio uma rotina que desliga tudo às 23 h e mostro o painel de energia traduzindo kWh em
reais — linguagem que a família entende. Importante e honesto: o backend não estima energia, ele lê o
valor que o próprio medidor da Tapo reporta. Na demo em modo mock os números são fixos."

🖼️ **Visual:** `docs/screenshots/mob-3-rotinas.png` + `docs/screenshots/dashboard-light.png` (painel de
energia). Mostrar PWA instalado na home do celular.

---

## Slide 12 — Resultados: o que está PROVADO

- **Controle local da Tapo P110 comprovado ao vivo** (`docs/devices-analysis.md`):
  - `turnOn` → 200 OK em **201 ms** · `turnOff` → 200 OK em **332 ms** · leitura em cache **56 ms**
  - 501 correto em `setColorTemp` (P110 é tomada) → prova de conexão real, **sem fallback mock silencioso**
- **Latência ponta-a-ponta < limiar** para o controle físico medido (bem abaixo de 2 s)
- Segurança verificável: AES-256-GCM (IV+tag), anti-enumeração de contas, refresh hasheado
- Arquitetura testada: cobertura ~80 % (com exclusão **declarada** dos adapters de hardware)

🎤 **Fala:** "Este é o resultado mais sólido. A tomada respondeu em 201 e 332 milissegundos, com
códigos HTTP corretos. O argumento metodológico: receber 200 prova conexão real, porque uma falha
lançaria 503 ou 422 — não existe mock disfarçado. É a minha melhor evidência empírica."

🖼️ **Visual:** **tabela de latências** copiada de `docs/devices-analysis.md` (comando | resposta | ms).
Destacar os números 201/332 ms.

---

## Slide 13 — Resultados: o que ainda é HIPÓTESE (transparência)

- **Acurácia de voz ≥ 88 %** — infraestrutura de log existe (`voice_commands.latencyMs/confidence/intent`), mas **sem corpus rotulado coletado** `[PENDENTE]`
- **Atenção:** o `confidence` exibido é fórmula sintética (`0.6 + score·0.15`), **não é acurácia medida**
- **Energia antes/depois** — `[PENDENTE]` coleta real com a Tapo; em mock os valores são fixos (110 W, 0,42 kWh)
- **Custo < R$ 200** — `[PENDENTE]` Bill of Materials que **inclua o hub** (PC sempre ligado)
- **Inclusão de idosos / baixa-literacia** — `[PENDENTE]` nenhum teste de usabilidade ainda

🎤 **Fala:** "Aqui sou totalmente honesto. Três dos quatro critérios ainda não foram medidos. A
infraestrutura para medi-los existe e foi construída de propósito. Não vou apresentar o número de
'confidence' do parser como se fosse acurácia — seria desonesto, é só uma heurística de capacidade do
dispositivo."

🖼️ **Visual:** mesma tabela do Slide 4 com status real (✅ 1 / ⛔ 3). Aviso visual sobre o `confidence`
sintético. **[PENDENTE: idealmente converter pelo menos a latência de voz em ✅ antes da defesa — os
dados já são gravados, falta só agregá-los.]**

---

## Slide 14 — Limitações e ameaças à validade

- **Lâmpada Intelbras EWS 410 (Tuya) nunca foi controlada em hardware** — gargalo de provisionamento no SmartLife; contradição DPS 20 vs 1 não-resolvida
- **"Local-first" é caminho primário por configuração**, não fallback nuvem automático (TUYA ≠ TUYA_CLOUD)
- **Onboarding ainda exige chave local via portal Tuya** — contradiz "sem conhecimento técnico"
- **Tarifa R$/kWh fixa (0,92)** sem edição pelo usuário; energia não é estimada pelo backend
- Adapters de hardware (Tapo/Tuya LAN) **sem teste unitário**; parser por regras ≠ NLU

🎤 **Fala:** "Não escondo as fraquezas. A lâmpada Tuya não foi pareada a tempo — é problema de
provisionamento, não de código, e o adapter está pronto. O termo 'local-first' eu defendo com precisão:
é o caminho primário por configuração, e o sistema avisa quando falha, não cai silenciosamente para a
nuvem. E o onboarding ainda exige conhecimento técnico — é uma limitação real que declaro."

🖼️ **Visual:** lista honesta com ícone ⚠️; à direita, foto da EWS 410 com tarja "não pareada —
limitação declarada". Sem inflar.

---

## Slide 15 — Conclusão

- O CASAI **prova a viabilidade técnica** do controle local de IoT por voz pt-BR **sem nuvem** (evidência: Tapo P110 ao vivo)
- Contribuição defensável: **soberania de dados local-first + commissioning sem o app do fabricante** (documentado com rigor)
- O artefato é maduro: adapter pattern real, segurança estrutural, PWA instalável, CI sério
- **Reposicionamento honesto:** "baixo custo" e "inclusão social" tratados como **hipóteses com limitações declaradas**, não como fatos provados

🎤 **Fala:** "Concluo que a viabilidade técnica está demonstrada para o controle local por voz sem
nuvem. A contribuição real do trabalho não é 'fazer Alexa mais barata' — é soberania de dados e
comissionamento local. Os pilares sociais ficam como hipóteses honestas a serem validadas."

🖼️ **Visual:** card final com a frase-tese e três ✅ (local provado, soberania, arquitetura) + dois 🟡
(custo, inclusão).

---

## Slide 16 — Trabalhos futuros

- **Executar o experimento de voz:** corpus pt-BR (≥ 30–100 enunciados, múltiplos falantes), WER + matriz de confusão + latência p50/p95
- **Coleta de energia antes/depois** com a Tapo P110 em cenário controlado
- **BOM comparativo** (incluindo o hub) vs. Echo Dot / Nest Mini / SmartThings / HA+RPi
- **Teste de usabilidade** (n=5, público-alvo) + auditoria WCAG (Lighthouse / axe)
- Fechar **commissioning da EWS 410** em hardware; fallback local→nuvem; NLU; Zigbee/Matter

🎤 **Fala:** "O caminho à frente é direto e a infraestrutura já está pronta para a maioria: agregar os
logs de voz que já gravo, rodar a coleta de energia com a Tapo, montar a planilha de custo honesta e
fazer um teste de usabilidade pequeno. São semanas de execução, não de arquitetura."

🖼️ **Visual:** roadmap em 5 caixas com ícone de relógio. Marcar quais já têm infra pronta (voz, energia).

---

## Slide 17 — Encerramento / Agradecimentos

- **CASAI — automação residencial local-first, por voz pt-BR, soberania de dados**
- Obrigado: orientador(a), banca, instituição
- Repositório · demo PWA · contato

🎤 **Fala:** "Obrigado pela atenção. O código, a documentação de engenharia e a demo estão disponíveis.
Fico à disposição da banca para as perguntas."

🖼️ **Visual:** logo CASAI + `docs/screenshots/dashboard-dark.png`. QR code para o repositório/demo.

---

## Slide 18 (RESERVA) — Perguntas prováveis e respostas-âncora

> Mostrar só se perguntado. Respostas curtas e honestas.

- **"Qual a acurácia de voz medida, com quantos falantes?"** → Infra de medição existe; coleta não
  concluída; **não apresentar o `confidence` como acurácia**. Protocolo de avaliação está definido.
- **"< R$ 200 não inclui o computador sempre ligado?"** → Correto, o hub é pré-requisito. Apresentar
  BOM em dois cenários: custo incremental sobre PC existente vs. greenfield; diferencial é
  **soberania**, não centavos.
- **"Por que não Alexa, que faz pt-BR melhor?"** → O diferencial é **100 % local, sem nuvem/mensalidade,
  áudio descartado** — terreno onde Alexa/Google estruturalmente perdem.
- **"É mesmo local-first ou cai para a nuvem?"** → Caminho local primário por configuração; **avisa
  quando falha**, não cai em silêncio (princípio nº 1). Fallback automático: decisão de MVP.
- **"A lâmpada Intelbras funcionou?"** → Não pareada a tempo (provisionamento, não código). Prova de
  hardware é a **Tapo P110**. Adapter pronto.
- **"O dashboard mede energia real?"** → O backend **não estima kWh**; consome o valor do medidor Tapo.
  Em mock é fixo. Prova de economia = trabalho futuro.
- **"Qual a contribuição científica?"** → Commissioning **local-first sem o app do fabricante** +
  soberania de dados; documentado adversarialmente (`RELATED_WORK_Home_Assistant.md`).
- **"Privacidade / LGPD?"** → Áudio descartado no `finally` após transcrever, `local_key` cifrada
  AES-256-GCM, processamento no hub. Limitação: `transcript` em texto sem política de retenção → propor
  TTL/anonimização, citar **Lei 13.709/2018**.

🖼️ **Visual:** slide denso só para consulta; não exibir na corrida normal.

---

## Checklist de produção antes da defesa (não é slide)

`[PENDENTE]` itens de maior risco, em ordem:
1. **Agregar os logs de `voice_commands`** → transformar latência de voz em ✅ (dados já gravados; menor esforço, maior retorno).
2. **Tabela comparativa de 5 eixos** (Slide 5) — Alexa / Google / SmartThings / HA / CASAI.
3. **BOM honesto incluindo o hub** (Slide 13).
4. **Dados BR reais** (IBGE / CETIC / Anatel) no Slide 3 — hoje 0 citações no projeto.
5. **Vídeo de backup da demo Tapo** (Slide 9) — rede da banca é risco real.
6. Diagramas dos Slides 6 e 7 (blocos + classes do adapter).
7. Opcional/forte: 1 teste de usabilidade n=5 (Slides 13/16).

**Arquivos-fonte de evidência citáveis na defesa:**
- `docs/devices-analysis.md` — latências 201/332 ms, Tapo provada.
- `docs/RELATED_WORK_Home_Assistant.md` — diferencial vs. HA, fontes oficiais.
- `apps/api/src/devices/device-adapter.factory.ts:35-53` — adapter pattern.
- `apps/api/src/voice/whisper.stt.ts` — Whisper no hub, áudio descartado.
- `apps/api/src/voice/voice-command.parser.ts:138` — `confidence` sintético (NÃO é acurácia).
- `apps/api/src/devices/adapters/mock.adapter.ts:73-74` — energia mock fixa.
- `docs/screenshots/` — todos os screenshots reais para os visuais.
