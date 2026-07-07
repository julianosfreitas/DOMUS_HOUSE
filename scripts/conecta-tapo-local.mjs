#!/usr/bin/env node
/*
 * Reconecta o Tapo P110 REAL ao app local (localhost) e o deixa em Dispositivos.
 * Idempotente: atualiza o device existente ou cria um novo.
 *
 * QUANDO USAR: depois de qualquer clone/reset do banco (ex.: importar o dump do
 * Mac mini), porque um clone sobrescreve o device com o IP/creds da OUTRA rede.
 * Rode este script e o Tapo volta a controlar nesta rede.
 *
 * USO:  node scripts/conecta-tapo-local.mjs
 * Lê TAPO_P110_IP / TAPO_EMAIL / TAPO_PASS do .env da RAIZ (não hardcoda segredo).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const IP = env.TAPO_P110_IP;
const EMAIL = env.TAPO_EMAIL;
const PASS = env.TAPO_PASS;
const API = process.env.API_URL || 'http://localhost:4000';
const DEMO = { email: 'domus@tcc.com', password: 'domus123' };

if (!IP || !EMAIL || !PASS) {
  console.error('✗ Faltam TAPO_P110_IP / TAPO_EMAIL / TAPO_PASS no .env da raiz.');
  process.exit(1);
}

const H = (tok) => ({ Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' });
async function api(path, opts) {
  const r = await fetch(`${API}${path}`, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${opts?.method || 'GET'} ${path} -> HTTP ${r.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

const run = async () => {
  const { accessToken } = await api('/api/auth/sign_in', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(DEMO),
  });
  const devices = await api('/api/devices', { headers: H(accessToken) });
  let tapo = devices.find((d) => d.protocol === 'TAPO');
  const creds = { ip: IP, tapoEmail: EMAIL, tapoPass: PASS, supportsEnergy: true };

  if (tapo) {
    await api(`/api/devices/${tapo.id}`, { method: 'PATCH', headers: H(accessToken), body: JSON.stringify(creds) });
    console.log(`✓ Tapo atualizado: ${tapo.name} (${tapo.id})`);
  } else {
    tapo = await api('/api/devices', {
      method: 'POST', headers: H(accessToken),
      body: JSON.stringify({ name: 'Tomada Tapo P110', type: 'PLUG', protocol: 'TAPO', ...creds }),
    });
    console.log(`✓ Tapo criado: ${tapo.id}`);
  }
  const state = await api(`/api/devices/${tapo.id}/state`, { headers: H(accessToken) });
  console.log(`✓ Estado lido do hardware (${IP}): ${JSON.stringify(state)}`);
  console.log('✓ OK — Tapo conectado e em Dispositivos no localhost.');
};

run().catch((e) => { console.error('✗ FALHOU:', e.message); process.exit(1); });
