# Configuração de OAuth Google e Segredos — passos manuais

Itens que **exigem ação humana** (não dá para resolver só no código). Levantados na
auditoria de 22/06/2026. Faça na ordem.

---

## 1. Login com Google está quebrado (Client ID morto)

**Sintoma:** o botão "Entrar com o Google" aparece, mas o login falha com
`invalid_client` / 401. Login por e-mail/senha e o botão **demo** continuam funcionando.

**Causa:** o OAuth Client ID atual
`317087068529-phanuc0qapfup52dv35un3ipbofsjkdc.apps.googleusercontent.com` foi
**deletado no Google Cloud**. O Client ID é **público** (vai embutido no bundle da web),
então não é segredo — só precisa ser trocado por um válido.

### Passos

1. **Criar um novo OAuth Client ID** em
   [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   → *Create credentials* → *OAuth client ID* → tipo **Web application**.
2. Em **Authorized JavaScript origins**, adicione todas as origens de onde o app abre:
   - `http://localhost:3000` (dev / `next dev`)
   - `http://localhost:3100` (docker compose)
   - a URL pública da Vercel (ex.: `https://casai.vercel.app`)
3. Copie o **Client ID** gerado e cole nos **3 lugares** (mesmo valor em todos):

   | Arquivo | Linha/Variável | Observação |
   |---------|----------------|------------|
   | `apps/web/.env.local` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID=` | front em dev (gitignored) |
   | `.env` (raiz, local) | `GOOGLE_CLIENT_ID=` | API em dev (gitignored) |
   | `render.yaml` | `key: GOOGLE_CLIENT_ID` → `value:` (~linha 39) | deploy Render (versionado) |
   | Vercel → Project → Settings → Environment Variables | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | deploy web |

4. **Rebuild** do front (o `NEXT_PUBLIC_*` é embutido em build): redeploy na Vercel
   e/ou `npm run build` local.

> Sem essas variáveis o backend responde **503** em `POST /api/auth/google` e o botão
> Google **não aparece** no front — comportamento intencional e seguro.

---

## 2. Higiene de segredos

**Status bom:** o `.env` real (com `JWT_SECRET`, `CASAI_ENCRYPTION_KEY` e credenciais
Tuya Cloud) **NÃO está versionado** — está no `.gitignore` (linhas 13–15: `.env`,
`.env.local`, `.env.*.local`). O gate `gitleaks` do CI continua válido.

**Ação recomendada (precaução):** como esses valores reais existiram no working tree
durante o desenvolvimento/análise, rotacione antes da defesa pública:

- **`JWT_SECRET`** — gere novo (≥32 chars):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
  Efeito: invalida todos os access/refresh tokens atuais → usuários refazem login. Inócuo.

- **Credenciais Tuya Cloud** (`TUYA_CLOUD_ACCESS_ID/SECRET/DEVICE_ID`) — se foram
  expostas, regenere o *Access Secret* no projeto em `iot.tuya.com`.

- **`CASAI_ENCRYPTION_KEY` (64 hex)** — ⚠️ **CUIDADO:** essa chave cifra a `local_key`
  Tuya e a senha Tapo guardadas no banco (AES-256-GCM). **Trocar a chave torna
  ilegíveis os segredos de dispositivos já cadastrados** — esses devices param de ser
  controláveis até **recadastrar as credenciais**. Para o TCC (dados MOCK/seed) é
  indolor; com hardware real cadastrado, rotacione e **recadastre os dispositivos**.
  Gerar nova:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- **Deploy (Render):** defina `JWT_SECRET` e `CASAI_ENCRYPTION_KEY` como
  *environment variables* no painel do Render (NÃO como `value:` no `render.yaml`).
  No blueprint elas já vêm como `generateValue`/`sync:false` — confira que não há
  segredo real escrito no `render.yaml` versionado.

---

## 3. Checklist de "subir o sistema" (config, fora do código)

- [ ] `.env` local preenchido a partir do `.env.example` (agora inclui `PORT` e `WEB_ORIGIN`).
- [ ] `DEMO_MODE=true` no deploy público (Render) para semear dados no boot — **já no `render.yaml`**.
- [ ] `WEB_ORIGIN` casa com a porta de onde a web abre: `:3000` (next dev) ou `:3100`
      (docker compose). O CORS agora **aceita lista separada por vírgula**
      (`http://localhost:3000,http://localhost:3100`).
- [ ] Novo `GOOGLE_CLIENT_ID` válido nos 4 lugares do item 1 (ou aceitar login só por e-mail/demo).
- [ ] Paridade de Node: local roda Node 24; CI/Docker/Render fixam **Node 20** (a paridade real de deploy é 20).
