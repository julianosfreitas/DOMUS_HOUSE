# spikes/ — Validação de hardware (Passo 1 — PONTO DE PARADA)

Scripts **descartáveis** que provam que o controle/leitura local funciona **antes**
de construir o sistema. Eles dependem do hardware físico e de credenciais que só
você tem — por isso **o Claude Code escreveu os scripts, mas você precisa executá-los**.

## 1. Instale as dependências dos spikes

```bash
cd spikes
npm install
```

> `nodejs-whisper` compila o `whisper.cpp` na instalação e baixa o modelo no
> primeiro uso — precisa de build tools (make/cmake) e pode demorar alguns minutos.

## 2. Preencha as credenciais

Copie `../.env.example` para `../.env` (na raiz do projeto) e preencha. Os spikes
leem o `.env` via `dotenv`. Variáveis necessárias:

| Variável | Para quê | Onde obter |
|----------|----------|------------|
| `TUYA_EWS410_ID` | Device ID da lâmpada | `tuya-cli wizard` (veja docs/HARDWARE_SETUP.md) |
| `TUYA_EWS410_KEY` | local_key da lâmpada | idem |
| `TUYA_EWS410_IP` | IP da lâmpada na LAN | app/roteador |
| `TUYA_PROTOCOL_VERSION` | 3.3 / 3.4 / 3.5 | comece em 3.3 |
| `TAPO_P110_IP` | IP da tomada | app Tapo → Info do dispositivo |
| `TAPO_EMAIL` / `TAPO_PASS` | conta TP-Link | sua conta Tapo |
| `AUDIO_FILE` | amostra .wav pt-BR p/ whisper | grave "ligar a luz da sala" |

## 3. Rode os três spikes

```bash
npm run tuya      # esperado: a lâmpada liga, espera 2s e desliga
npm run tapo      # esperado: imprime a potência (confirme a unidade W/mW!)
AUDIO_FILE=./amostra.wav npm run whisper   # esperado: transcreve em < 2s
```

## 4. Critério de aprovação

- [ ] `tuya` ligou/desligou a lâmpada → controle local Tuya OK
- [ ] `tapo` imprimiu a potência → leitura de energia OK + **unidade confirmada**
- [ ] `whisper` transcreveu pt-BR em tempo aceitável

> ⚠️ **Se o `tuya` falhar repetidamente na local_key, PARE.** A arquitetura
> "100% local" depende disso. Avise para reavaliarmos um fallback de nuvem.
>
> ✅ **Se os três passarem, o maior risco do projeto está eliminado** e o build
> (Passo 2 em diante) pode prosseguir com segurança.
