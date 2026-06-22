# Análise técnica — Dispositivos (CASAI): Tapo + Tuya

> **Data:** 2026-06-22 · Combina **testes ao vivo** (stack local no ar: API :4000 → adapters → LAN/cloud) com **análise estática** do código (`apps/api`, todas as refs citam `arquivo:linha`). Escopo: módulos `devices` e `energy`, os 5 adapters e o poller de energia.

## Testes ao vivo executados (2026-06-22)

Stack local de pé. Comandos disparados via API real (`POST /devices/:id/command`), que aciona o `TapoAdapter` → hardware na LAN.

### 🔌 Tapo P110 — ✅ TOTALMENTE FUNCIONAL

| Rota / comando | Resultado | Veredito |
|---|---|---|
| `GET /devices/:id/state` | 200 `{on:false}` (56ms) | leitura real (sessão em cache) |
| `POST /command {turnOn}` | 200 `{on:true}` (201ms) | **ligou** de verdade |
| `POST /command {turnOff}` | 200 `{on:false}` (332ms) | **desligou** |
| `POST /command {toggle}` ×2 | 200, alterna e restaura | ok |
| `setBrightness {brightness:50}` | **501** "não suporta brilho" | correto (P110 é tomada) |
| `setColor {color:'#ff0000'}` | **501** "não suporta cor" | correto |
| `setColorTemp {colorTemp:4000}` | **501** "não suporta temperatura" | correto |
| `{command:'xpto'}` | **400** "Comando inválido" | validação ok |
| `{command:'setBrightness', value:50}` | **400** "property value should not exist" | campo certo é `brightness`, não `value` |

**Prova de hardware real:** `handleControlError` lança 503/422 em falha → receber **200** prova conexão (não há fallback mock silencioso). Latência baixa = cache de adapter (sessão TCP reusada).

**Energia — funciona:** `GET /devices/:id/energy/history` → **6 buckets horários** com `591/720/603/...` samples (poller lê o device a cada ~5s). `avgWatts ~0` (um bucket 0.47W) = **tomada sem carga** (0W verdadeiro), NÃO bug. `energy/summary` = 0W pelo mesmo motivo. Plugar um aparelho na tomada → consumo aparece.

### 💡 Tuya / EWS 410 — ❌ SEM DEVICE (nada a controlar)

| Camada | Teste | Resultado |
|---|---|---|
| Tuya Cloud (conta antiga) | `GET /v1.0/iot-01/associated-users/devices` | autentica (`success=true`), mas **0 devices** (projeto esvaziou — até o `vdevo` sumiu) |
| Tuya LAN (`tuyapi`) | UDP discovery 6666/6667 (15s) | **0 devices** (EWS não pareada nesta Wi-Fi) |
| Controlável hoje? | — | **Não** — cloud vazio + LAN vazio |

→ Os adapters Tuya (LAN e Cloud) estão prontos e a cloud autentica, mas **não há device Tuya** registrado/pareado. Integração da EWS 410 depende do runbook `docs/EWS410-fresh-start.md` (parear no SmartLife → extrair `local_key` → cadastrar `protocol:TUYA`).

---

## Visão geral

O controle de dispositivo é fim-a-fim e local-first (CLAUDE.md §4). Uma requisição HTTP autenticada (JWT global, `auth.module.ts:31-32`) chega ao `DevicesController` (`apps/api/src/devices/devices.controller.ts`), que delega ao `DevicesService`. O serviço carrega a entidade `Device` completa (com segredos cifrados) do Prisma, resolve um `DeviceAdapter` via cache em memória (criado sob demanda pela `DeviceAdapterFactory`, que descriptografa as credenciais só ali), e **enfileira** a operação numa fila serializada por `deviceId` (`DeviceCommandQueue`). Dentro da task, o adapter faz `connect()`, aplica o comando, lê o estado real, sobrepõe a intenção do comando (`overlayExpectedState`), persiste `ONLINE`/`lastSeen`/`lastState` e emite um broadcast WebSocket. O adapter concreto fala com o hardware via a lib específica do protocolo (tuyapi LAN, tp-link-tapo-connect, Tuya Cloud HTTP, HA REST, ou simulação Mock).

```
HTTP (JWT) ─▶ DevicesController ─▶ DevicesService.executeCommand
                                        │
                                        ├─ findEntity (Prisma, segredos cifrados)
                                        ├─ getAdapter ─▶ Map<deviceId,Adapter> (cache)
                                        │                   └─ MISS ─▶ DeviceAdapterFactory.create (decrypt em memória)
                                        │
                                        └─ DeviceCommandQueue.enqueue(deviceId, task)
                                                 │  (serial por device, paralelo entre devices)
                                                 ▼
                                              task: adapter.connect ─▶ applyCommand ─▶ readState
                                                       ─▶ overlayExpectedState ─▶ persistOnline ─▶ WebSocket
                                                                 │
                                                                 ▼
                                                          HARDWARE (tuyapi / tp-link / Tuya Cloud / HA REST / Mock)
```

## Rotas

Prefixo global `/api` (`apps/api/src/main.ts:26`). Auth global (`JwtAuthGuard` + `ThrottlerGuard`, `auth.module.ts:31-32`); nenhuma rota abaixo usa `@Public`. `ValidationPipe` global (`main.ts:18-19`). Todas as queries filtram por `user.id` (`@CurrentUser()`).

| Método | Path | Auth | DTO | Retorna | Obs. |
|--------|------|------|-----|---------|------|
| GET | `/api/devices` | JWT | — (só `@CurrentUser`) | `Device[]` com `PUBLIC_SELECT` (`devices.service.ts:26-43`), `orderBy createdAt asc` | Sem segredos; filtrado por `userId`. `devices.controller.ts:23-26` |
| POST | `/api/devices/discover` | JWT | — | `{ found: [...], hint }` | `@HttpCode(200)`. Scan LAN passivo Tuya + TCP + OUI; marca `alreadyAdded`. `controller.ts:28-32` |
| GET | `/api/devices/:id` | JWT | `@Param id` | `Device` (`PUBLIC_SELECT`) | 404 `Dispositivo não encontrado` se não for do user. `controller.ts:34-37` |
| GET | `/api/devices/:id/state` | JWT | `@Param id` | `DeviceState` | Lê SEM mutar ("Testar conexão"): `connect→readState→persistOnline`+broadcast. Offline→503. `controller.ts:40-43` |
| POST | `/api/devices` | JWT | `CreateDeviceDto` | `Device` criado (`PUBLIC_SELECT`) | 201 (default). Segredos cifrados AES-256-GCM antes de salvar; emite `emitDeviceCreated`. `controller.ts:45-48` |
| PATCH | `/api/devices/:id` | JWT | `UpdateDeviceDto` (`PartialType`) | `Device` atualizado | `assertOwnership` (404); recifra segredos; **invalida adapter em cache**. `controller.ts:50-53` |
| DELETE | `/api/devices/:id` | JWT | `@Param id` | `{ ok: true }` | `assertOwnership`; invalida adapter; emite `emitDeviceRemoved`. `controller.ts:55-58` |
| POST | `/api/devices/:id/command` | JWT | `DeviceCommandDto` | `DeviceState` | `@HttpCode(200)`. Fila serializada; offline→503; comando rejeitado→422. `controller.ts:60-64` |
| GET | `/api/devices/:id/energy/history` | JWT | `@Param id` + `EnergyHistoryQueryDto` | `{ deviceId, period, granularity, buckets[] }` | `period` ∈ `24h/7d/30d` (def `24h`); `granularity` ∈ `hour/day` (def `hour`). `energy.controller.ts:11-18` |
| GET | `/api/energy/summary` | JWT | — | `{ totalWatts, kwhToday, kwhMonth, costToday, costMonth, projectedMonthlyCost, rate }` | Soma a última `energyReading` de cada device com `supportsEnergy`. `energy.controller.ts:20-23` |

**DTOs relevantes:**
- `CreateDeviceDto`: `name` (1-80, obrig), `type` (enum `DeviceType`), `protocol` (enum `Protocol`), `roomId?`, `ip?` (`@IsIP` → "IP inválido"), `externalId?`, `protocolVersion?` (3.3/3.4/3.5), `localKey?` (texto puro na entrada → cifrado), `tapoEmail?`, `tapoPass?`, `supportsBrightness/Color/ColorTemp/Energy?` (bool).
- `DeviceCommandDto`: `command` (`@IsIn ['turnOn','turnOff','toggle','setBrightness','setColor','setColorTemp']` → "Comando inválido"), `brightness?` (int 0-100), `color?` (`@IsHexColor`), `colorTemp?` (int 2000-7000 K).

> Nota: `EnergyController` usa `@Controller()` sem base — os paths completos estão nos métodos, por isso `history` fica sob `/api/devices/...` e não `/api/energy/...`.

## Fluxo de controle

### Passo a passo de `executeCommand` (`devices.service.ts:141-161`)

1. **Entrada** — `POST /devices/:id/command` (`controller.ts:60-64`, `@HttpCode 200`) valida o `DeviceCommandDto` (class-validator) e chama `executeCommand(user.id, id, dto)`.
2. **Carga da entidade** — `findEntity(userId,id)` (`service:223-229`) → `prisma.device.findFirst({where:{id,userId}})` traz a entidade **completa** (com `localKeyEnc`, `tapoPassEnc`); 404 se nada.
3. **Resolução do adapter** — `getAdapter(device)` (`service:238-245`) consulta `Map<deviceId,DeviceAdapter>` (`service:49`). HIT reusa a instância (conexão TCP persistente); MISS chama `factory.create(device)` e grava no Map.
4. **Factory + descriptografia** — `device-adapter.factory.ts:19-53` monta o `AdapterContext` descriptografando `localKey`/`tapoPass` via `crypto.decrypt` **apenas aqui em memória** (`factory:26-28`); `switch(protocol)` → adapter concreto (`ZIGBEE`→`NotImplementedException`).
5. **Enfileiramento** — `this.queue.enqueue(device.id, task)` (`service:145`); a task só roda quando a vez do device chegar na fila.
6. **Task (caminho feliz, `service:146-156`)** — `adapter.connect()` (reusa TCP se já conectado) → `applyCommand(adapter, dto)` (`service:316-340`) faz `switch` do comando e valida payload (ex.: `brightness` ausente → `UnprocessableEntityException`) → escreve no hardware.
7. **Leitura + overlay** — `read = adapter.readState()` (`service:153`) → `overlayExpectedState(read, dto)` (`service:297-314`) sobrepõe a **intenção** do comando sobre a leitura (`turnOn`→`on:true`, `setBrightness`→`on:true`+`brightness`, etc.) para mascarar a consistência eventual da Tuya Cloud; `toggle` confia na leitura.
8. **Persistência + broadcast** — `persistOnline(userId,id,state)` (`service:262-276`) → `prisma.device.update({lastState, lastSeen, status:'ONLINE'})` + `events.emitStatusChanged(...,'ONLINE')`. Falha de banco vira `warn` (não 500), mas o estado ainda é emitido/retornado. A task retorna `state` → HTTP 200.
9. **`getState` (`service:167-180`)** — mesma estrutura, **sem** `applyCommand`/overlay: só `connect→readState→persistOnline`. Não liga/desliga.
10. **`pollEnergy` (`service:207-213`)** — chamado pelo poller (`energy.service.ts:71`); também passa pela `queue.enqueue` para não concorrer com comandos; `connect()`+`adapter.readEnergy()`.

### Fila por device (`device-command.queue.ts`)

Serializa **por `deviceId`** via `Map<string,Promise<unknown>>` (`chains`, linha 10). `enqueue(deviceId,task)` (12-25): `previous = chains.get(deviceId) ?? Promise.resolve()`; encadeia `next = previous.then(task, task)` — **os dois handlers** garantem que a task rode mesmo que o elo anterior tenha rejeitado. Guarda no Map um elo "silenciado" `next.then(()=>undefined,()=>undefined)` que nunca rejeita, evitando travar a fila. Retorna `next` (a promise real, que pode rejeitar) para o chamador.

- **Efeito:** comandos ao **mesmo** device rodam em série (a lâmpada Tuya aceita 1 conexão local por vez); comandos a devices **diferentes** correm em paralelo.
- `executeCommand`, `getState` e `pollEnergy` compartilham a mesma fila por device — um poll de energia nunca colide com um comando.
- `hasPending(deviceId)` (28-30) só checa `chains.has` — diagnóstico/teste (e enganoso, ver Riscos).

### Cache de adapter (`devices.service.ts:49`)

`Map<deviceId,DeviceAdapter>`. `getAdapter` (238-245) reusa ou cria. Motivo: conexão TCP persistente (`TuyaAdapter.connect` só reconecta se `!isConnected()`, `tuya.adapter.ts:30-33`). **Invalidação** via `invalidateAdapter(id)` (247-255): `adapter.disconnect()` (best-effort) + remove do Map. Disparada em `update()` (`service:124`), `remove()` (`service:130`) e em `handleControlError` ao receber `DeviceOfflineError` (`service:281`). **O cache nunca expira por tempo nem LRU** — vive enquanto o processo viver.

### Tratamento de erro (`handleControlError`, `devices.service.ts:279-291`)

`try/catch` envolve a task em `executeCommand` (157-159) e `getState` (176-178).

| Origem do erro | Ação | Status HTTP | Significado |
|----------------|------|-------------|-------------|
| `DeviceOfflineError` (timeout / falha de conexão / get / set) | `invalidateAdapter` + `update status:'OFFLINE'` + `emitOffline` | **503** `Dispositivo offline ou inacessível` | Dispositivo inacessível na rede |
| `DeviceCommandError` (device respondeu mas recusou: DP/credencial/permissão/rate-limit) | NÃO marca offline, NÃO invalida adapter | **422** `O dispositivo rejeitou o comando` | Online, mas rejeitou |
| Validação de payload em `applyCommand` (brightness/color/colorTemp ausente) | lança antes de tocar o hardware | **422** | Payload inválido |
| `NotImplementedException` (capacidade não suportada / `ZIGBEE` na factory) | sobe cru | **501** | Não implementado |
| `NotFoundException` (`findEntity`/`assertOwnership`) | sobe cru | **404** | Não é do user / inexistente |
| Qualquer outro | rethrow cru | **500** | Erro não mapeado |

## Adapters

Interface comum: `DeviceAdapter` (`device-adapter.interface.ts`) — `connect/disconnect/turnOn/turnOff/toggle/setBrightness/setColor/setColorTemp/readState/readEnergy`. Erros padronizados: `DeviceOfflineError`, `DeviceCommandError`.

### Tapo (TP-Link P110, LAN local)

- **Arquivo:** `apps/api/src/devices/adapters/tapo.adapter.ts`
- **Lib:** `tp-link-tapo-connect` v2.0.15 — `loginDeviceByIp(email,pass,ip)` (`tapo.adapter.ts:7`, chamada em `:131`); suporta KLAP + legado com fallback automático.
- **Métodos:** `connect` (login + cacheia sessão, idempotente, `:40`), `disconnect` (`:47`), `turnOn` (`s.turnOn()`, `:52`), `turnOff` (`:56`), `toggle` (lê `getDeviceInfo()` e liga/desliga **dentro de um único `run()`** para retry coerente, `:60`), `setBrightness` (gate `supportsBrightness`, clamp 0-100, `:69`), `setColor` (gate, `s.setColour(hex)`, `:76`), `setColorTemp` (**sempre lança** `NotImplementedException` — P110 é tomada, `:83`), `readState` (`{on:device_on, brightness}`, `:88`), `readEnergy` (gate `supportsEnergy`, `:94`).
- **Unidades:** `current_power` mW→W (`/1000`, `:105`); `today_energy`/`month_energy` Wh→kWh (`/1000`, `:106-107`). `readState` devolve `brightness` cru (0-100 do device, sem reescala). `setBrightness` clampa 0-100.
- **Quirks/bugs:**
  - A lib usa **axios SEM timeout**; um P110 desligado-mas-roteável travaria 30-75s. Mitigado com `withTimeout=5000ms` via `Promise.race` (`CONNECT_TIMEOUT_MS :28`, `:141-148`).
  - `readEnergy` retorna `null` se `current_power===undefined` (evita gravar 0W falso e distorcer médias) — `:101-103`.
  - `setColorTemp` **nunca** funciona neste adapter; comentário diz que lâmpadas Tapo usariam `setColour`, não exposto — `:83-86`.
  - `run()` faz re-login em qualquer erro e **só na segunda falha** lança `DeviceOfflineError` (`:113-126`) — um erro não-transitório custa 2 tentativas + 2 timeouts.
  - `readState` faz cast `info as unknown as {brightness?}` (lib não tipa `brightness`, `:90`); `getEnergyUsage` narrowing manual via `TapoEnergyRaw` (`:18-23`).

### Tuya LAN (Intelbras EWS 410 / Tuya white-label, LAN local)

- **Arquivo:** `apps/api/src/devices/adapters/tuya.adapter.ts`
- **Lib:** `tuyapi` v7.7.x — `new TuyaDevice({id,key,ip,version,issueGetOnConnect:false})` (`:34-40`); `device.on('error',...)` (`:42`); `connect`/`isConnected`/`disconnect`/`get({schema:true})` (`:99`)/`set({dps,set})` (`:120`).
- **Métodos:** `connect` (cria `TuyaDevice`, registra handler `error`, reaproveita TCP, `:30`), `disconnect` (`:52`), `turnOn`/`turnOff` (`setDps(POWER, bool)`, `:57`/`:61`), `toggle` (`readState()` + `setDps(POWER,!on)` — **2 round-trips, não atômico**, `:65`), `setBrightness` (gate; escala 0-100→10-1000, `:70`), `setColor` (gate; `setDps(COLOR, hexToTuyaHsv(hex))`, `:79`), `setColorTemp` (gate `supportsColorTemp`; 2700-6500K→0-1000, `:86`), `readState` (`:96`), `readEnergy` (**sempre `null`** — lâmpada não mede, `:113`).
- **Unidades:** DPS map `POWER=20, BRIGHTNESS=22, COLOR_TEMP=23, COLOR=24` (`:16`). Brilho 0-100→10-1000: `round(10 + pct/100*990)` (`:75`); volta `(rawBright-10)/990*100` (`:105`). ColorTemp 2700-6500K→0-1000 linear (`:91-93`). Cor: hex→HSV-hex 12 chars (h 0-360, s 0-1000, v 0-1000) via `hexToTuyaHsv` (`:147-169`). `protocolVersion` default `'3.3'` (`:38`).
- **Quirks/bugs:**
  - **CONTRADIÇÃO DPS 20 vs 1:** usa `DPS.POWER=20` (lâmpada "tipo B") mas o comentário `:2-5` avisa que firmwares variam e exige confirmar com dump `get({schema:true})`; muitas lâmpadas Tuya usam DPS 1. **Não-resolvido**.
  - **`work_mode` AUSENTE no caminho LAN:** `setColor` escreve só o DPS de cor (24) sem trocar para modo `colour`/`white` — ao contrário do Tuya Cloud. A lâmpada pode **ignorar a cor** se estiver em modo branco. Idem `setColorTemp` não força modo white.
  - `readState` faz `Boolean(dps[20])` e só lê `brightness`; **não lê cor nem colorTemp** (estado parcial, `:103-106`).
  - `toggle` não-atômico (`readState`+`setDps` separados, `:65-68`) pode dar race com outro comando.
  - Range Kelvin fixo 2700-6500 (`:91`); se o range físico for outro o mapeamento fica errado (memória registra contradição 2700 vs 3000 do EWS 410 real).
  - Handler `device.on('error')` só faz `logger.warn` (`:42`); erros do EventEmitter não propagam como rejeição — só o `withTimeout` de 5s (`CONNECT_TIMEOUT_MS :17`) protege.
  - `hexToTuyaHsv` produz HSV-hex de 12 chars; alguns firmwares esperam 14.

### Tuya Cloud (Tuya Cloud HTTP)

- **Arquivo:** `apps/api/src/devices/adapters/tuya-cloud.adapter.ts`
- **Lib:** `@tuya/tuya-connector-nodejs` v2.1.2 — `new TuyaContext({baseUrl,accessKey,secretKey})` (`buildTuyaContext :218-222`, token + HMAC-SHA256). `client.request<T>({method,path,body})` (`:193`). Endpoints: `POST /v1.0/devices/{id}/commands` (`:187`); `GET /v1.0/devices/{id}/status` (`:182`). Cliente injetável (`TuyaCloudClient`) para testes.
- **Métodos:** `connect`/`disconnect` (**no-op** — HTTP stateless, `:88`/`:89`), `turnOn`/`turnOff` (`switch_led`, `:91`/`:95`), `toggle` (`:99`), `setBrightness` (gate; 0-100→10-1000, `:104`), `setColorTemp` (gate; envia `WORK_MODE='white'`+temp, `:115`), `setColor` (gate; `WORK_MODE='colour'`+`colour_data_v2`, `:130`), `readState` (`getRawStatus`→Map por code, `:143`), `readEnergy` (**sempre `null`**, `:176`), `getRawStatus` (`:181`).
- **Unidades:** DP codes **string**: `switch_led`, `bright_value_v2`, `temp_value_v2`, `colour_data_v2`, `work_mode` (`:23-29`). Brilho 0-100→10-1000 (`:111`), volta `:152-154`. ColorTemp 2700-6500K→0-1000 (`:120-123`), volta `:161-163`. Cor hex→`{h:0-360,s:0-1000,v:0-1000}` via `hexToHsv` (`:268`), volta `hsvToHex` (`:291`).
- **Quirks/bugs:**
  - DP codes **v2**; firmware v1 (`bright_value`, `colour_data`) divergiria — comentário `:7-10`.
  - `setBrightness` com `pct=0` **NÃO apaga** (piso 10 deixa no mínimo aceso); para apagar use `turnOff()` — `:108-110`.
  - `setColor` entra em modo `colour` mas **não restaura** `work_mode` anterior (corte MVP, `:134-136`); `setBrightness` em modo cor mexe no `v` do HSV via `bright_value_v2`.
  - `colour_data_v2` volta como objeto **OU** string JSON conforme firmware; `coerceHsv()` normaliza (`:253-265`), `isHsv` valida (`:245-251`).
  - `readState` só reporta `colorTemp` se `work_mode != 'colour'` (`:157-164`) e só reporta `color` se `work_mode == 'colour'` (`:167-169`).
  - **Distingue corretamente** transporte (`DeviceOfflineError`, `:194-196`) de comando rejeitado (`DeviceCommandError` quando `success!==true`, `:199-206`) — não marca offline lâmpada que recusou.
  - Tolera resposta crua **ou** `AxiosResponse` via `isWrapped()` (`:197-198`/`:211-215`).
  - `configFromEnv` lança `ServiceUnavailableException` (503) se faltar `TUYA_CLOUD_*` (`:225-237`).

### Home Assistant (HA REST API)

- **Arquivo:** `apps/api/src/devices/adapters/home-assistant.adapter.ts`
- **Lib:** **nenhuma de terceiros** — `fetch` nativo Node 20 (`buildClient :174-197`) com `Authorization: Bearer` e `AbortSignal.timeout(5000)`. `GET /api/states/{entity_id}` (`:112`); `POST /api/services/{domain}/{service}` (`:141-144`). Cliente injetável (`HomeAssistantClient`).
- **Métodos:** `connect`/`disconnect` (**no-op** — REST stateless, `:74`/`:75`), `turnOn`/`turnOff`/`toggle` (`homeassistant.turn_on/off/toggle` — **toggle atômico no servidor HA**, `:77`/`:81`/`:85`), `setBrightness` (gate; `light.turn_on {brightness_pct:0-100}`, `:89`), `setColor` (gate; `{rgb_color:[r,g,b]}`, `:97`), `setColorTemp` (gate; `{color_temp_kelvin}`, `:104`), `readState` (`:111`), `readEnergy` (**sempre `null`** — energia é entidade sensor separada no HA, `:132`).
- **Unidades:** `brightness` HA 0-255→CASAI 0-100 na **leitura** (`round(b/255*100)`, `:117-119`); mas `setBrightness` **envia `brightness_pct` (0-100)** direto (assimetria intencional — HA aceita pct na escrita, `:93-94`). `color_temp_kelvin` passa direto (sem conversão, `:104-108`/`:121-123`). Cor hex→`[r,g,b]` 0-255 via `hexToRgb` (`:212`), volta `rgbToHex` (`:222`). `entity_id = ctx.externalId` (ex.: `light.sala`).
- **Quirks/bugs:**
  - **Assimetria de escala de brilho:** escrita usa `brightness_pct` (0-100), leitura converte de 0-255 — correto, mas fácil de confundir.
  - Mapeamento de erro por status: transporte/timeout→`DeviceOfflineError` (`:150-155`); `>=500`→`DeviceOfflineError` (`:159-162`); `4xx` (401 token, 404 entidade, 400 serviço)→`DeviceCommandError` (`:163-170`).
  - `setColor/Temp/Brightness` chamam `light.turn_on` — se a entidade for `switch` o serviço falha (4xx→`DeviceCommandError`); gates `supports*` devem prevenir.
  - `configFromEnv`→`ServiceUnavailableException` (503) se faltar `HOME_ASSISTANT_BASE_URL/TOKEN` (`:199-208`).
  - **ADR-001:** HA é apenas mais uma **fonte** atrás do adapter, não orquestrador; controla 1 entidade existente, sem provisionamento Wi-Fi (`:10-12`).

### Mock (simulação em memória, sem hardware)

- **Arquivo:** `apps/api/src/devices/adapters/mock.adapter.ts`
- **Lib:** nenhuma — estado em memória (`DeviceState` privado, `:15`); só `Logger`.
- **Métodos:** `connect` (`connected=true`, `:20`), `disconnect` (`:24`), `turnOn`/`turnOff`/`toggle` (`:28`/`:33`/`:38`), `setBrightness` (gate; clamp 0-100, `:43`), `setColor` (gate, `:50`), `setColorTemp` (gate, `:57`), `readState` (cópia rasa do state, `:64`), `readEnergy` (gate `supportsEnergy`; consumo simulado, `:68`).
- **Unidades:** brilho clamp 0-100 (`:47`); `colorTemp` kelvin cru (`:61`); cor hex cru (`:54`). Energia simulada: ligado `110 + brightness/5` W; desligado `0.5` W (`:73`); `kwhToday=0.42`, `kwhMonth=12.8` fixos (`:74`). Estado inicial `{on:false, brightness:80}` (`:15`).
- **Quirks/bugs:**
  - `ensureConnected` **não falha de verdade** quando desconectado — só `logger.debug` (`:77-82`). Difere de Tuya/Tapo que exigem conexão.
  - `setColorTemp/Color/Brightness` lançam `NotImplementedException` se o gate `supports*` for `false`, espelhando os adapters reais.
  - Valores de energia plausíveis mas fixos (`kwhToday/Month` constantes; watts varia com brightness mas não com tempo).
  - `readState` retorna cópia rasa (`{...state}`) — `color/colorTemp` só presentes se setados antes.

## Energia

### Como o poller funciona

Vive em `EnergyService` (`apps/api/src/energy/energy.service.ts`). **Não** usa `@Cron`/`@Interval`: usa `SchedulerRegistry` + `setInterval` manual registrado em `onModuleInit` (`:42-53`) sob o nome `'energy-poll'`, removido em `onModuleDestroy` (`:55-59`).

Cada tick chama `pollOnce()` (`:66-92`):
1. `devices.listEnergyDevices()` busca **todos** os `Device` com `supportsEnergy:true`, sem filtrar protocolo (`devices.service.ts:216-218`).
2. Para cada device, `devices.pollEnergy(device)` pega o adapter e **enfileira** `connect()`+`adapter.readEnergy()` (`devices.service.ts:207-213`).
3. Se `readEnergy` retorna `null`, o device é **pulado** (`continue`, `energy.service.ts:72-74`).
4. Caso contrário, grava `prisma.energyReading.create({watts, kwhToday, kwhMonth, readAt:now})` (`:76-84`).
5. Emite `energy:reading` via `events.emitEnergyReading` (`:85`).
6. Erros por device são capturados em `debug` sem derrubar o ciclo (`:87-89`).

**Intervalo:** `ENERGY_POLL_INTERVAL_SECONDS` (default **5s**; `.env`/`.env.example` trazem `=5`). Lido em `energy.service.ts:47` com fallback `'5'`; usado em `setInterval(segundos*1000)` (`:48-50`).

`GET /energy/summary` (`energy.controller.ts:20-22`) → `EnergyService.summary` (`:134-181`): para cada device do usuário com `supportsEnergy:true`, pega a `EnergyReading` mais recente (`findFirst orderBy readAt desc`) e soma `watts/kwhToday/kwhMonth`. `rate` vem de `user.energyRate`; custos = `kwh*rate`. **Sem nenhuma leitura, tudo fica 0.**

### Diagnóstico — por que o summary pode vir 0 (validado nos testes ao vivo)

- **Device sem carga / desligado:** Tapo real ligado sem carga reporta ~0W → `totalWatts` perto de 0. **← este é o caso atual** (6 leituras gravadas, todas ~0W).
- **Poller desligado em teste:** `onModuleInit` retorna cedo se `NODE_ENV==='test'` (`energy.service.ts:44-46`).
- **Nenhum device com `supportsEnergy=true`:** a **EWS 410 tem `supportsEnergy=false`**; só a **Tapo P110** mede.
- **`readEnergy` retorna `null` e o poller pula** (`energy.service.ts:72-74`): Tapo quando `current_power===undefined`; HA e Tuya (lâmpada) sempre `null`.
- **Tabela `energy_readings` vazia** (poller recém-iniciado / device sempre offline): `summary` acha `latest=null` e não soma.

## Riscos e pendências de código

**Alta prioridade**

- **CONTRADIÇÃO DPS 20 vs 1 (Tuya LAN, `tuya.adapter.ts:2-5,16`)** — não-resolvida; se o EWS 410 real usar DPS 1 para power, `turnOn/Off` falham silenciosamente. Confirmar com dump `get({schema:true})` antes de parear. (Bloqueador da integração real.)
- **`work_mode` ausente no Tuya LAN (`tuya.adapter.ts:79,86`)** — `setColor`/`setColorTemp` não trocam o modo da lâmpada; cor pode ser ignorada se o device estiver em modo branco. Tuya Cloud já trata isso; LAN não.
- **Race condition cache vs fila** — `getAdapter()` é chamado **fora** da fila (`devices.service.ts:143,169,211`), antes do `enqueue`. Se `update()`/`remove()` rodarem entre o `getAdapter` e a task, `invalidateAdapter` pode dar `disconnect` numa conexão que a task enfileirada vai usar.
- **`overlayExpectedState` mente para o usuário (`service:297-314`)** — marca `on:true` e sobrepõe valores mesmo que o device tenha rejeitado parte do comando; `lastState` retornado/persistido pode divergir do estado físico real até o próximo `readState` fresco.

**Média prioridade**

- **Adapter cache sem TTL/limite (`service:49`)** — o Map cresce com o nº de devices e mantém sockets TCP abertos indefinidamente; sem evicção por inatividade, acumula conexões mortas só limpas quando um comando falha com `DeviceOfflineError`.
- **`handleControlError` não distingue timeout transitório de offline real (`service:279-291`)** — qualquer timeout de 5s vira `DeviceOfflineError`→`OFFLINE`+503, sem retry/backoff.
- **Tapo `run()` custa 2 tentativas + 2 timeouts (`tapo.adapter.ts:113-126`)** — re-login automático em qualquer erro; um erro lógico não-transitório só falha na segunda tentativa (até ~10s de latência percebida).
- **`persistOnline` engole falha de banco (`service:262-276`)** — mesmo assim emite `emitStatusChanged ONLINE`; `lastState` no DB fica defasado sem retry, gerando inconsistência silenciosa entre WebSocket e banco.
- **`pollEnergy` compete pela mesma fila dos comandos do usuário** — um poll lento de energia (Tapo) pode atrasar a resposta de um `turnOn` no mesmo device.
- **Erros do EventEmitter do tuyapi só logados como `warn` (`tuya.adapter.ts:42`)** — um erro assíncrono de socket pode não virar `DeviceOfflineError`, deixando o adapter num estado `connected` inconsistente até o próximo timeout.

**Baixa prioridade / dívida**

- **`hasPending(deviceId)` enganoso (`device-command.queue.ts:28-30`)** — `chains.set` guarda elo permanente e nunca faz `chains.delete` quando a fila esvazia; na prática é "jaUsado" e **vaza entradas** do Map para devices removidos.
- **`applyCommand` e `overlayExpectedState` duplicam o `switch(dto.command)` (`service:297-314` e `:316-340`)** — adicionar um comando novo exige editar ambos sem checagem de exaustividade compartilhada.
- **`ZIGBEE` lança `NotImplementedException` em runtime (factory durante `executeCommand`)** — vira 501; o device ZIGBEE pode existir no banco, mas não há guarda antes de enfileirar/instanciar.
- **Ranges Kelvin fixos 2700-6500 (Tuya LAN `:91`, Tuya Cloud `:120-123`)** — possível divergência com o range físico real do EWS 410 (memória registra 2700 vs 3000).
- **Casts não-tipados** — Tapo `info as unknown as {brightness?}` (`tapo.adapter.ts:90`) e narrowing manual de energia; risco de quebra silenciosa se a lib mudar o shape.
