/**
 * spike: TESTE DE CICLO da tomada TP-Link Tapo P110 (controle local, KLAP).
 *
 * Sequência pedida: LIGA 10s  ->  descanso 2s (desligada)  ->  LIGA 20s  ->  FIM (desliga).
 * Em cada etapa lê estado (device_on) e energia (current_power) para confirmar
 * empiricamente que o comando surtiu efeito físico — serve de medição p/ o TCC.
 *
 * Lib: `tp-link-tapo-connect` v2.0.15 — loginDeviceByIp tenta KLAP e cai p/ legado.
 *   device.turnOn() / turnOff() / getDeviceInfo() / getEnergyUsage()
 *
 * Rodar:  cd spikes && npm i && npm run tapo:cycle
 * Requer no .env (raiz):  TAPO_P110_IP, TAPO_EMAIL, TAPO_PASS
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Carrega o .env da RAIZ do projeto (spikes/../.env), independente do cwd de execução.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env') });

const ip = process.env.TAPO_P110_IP;
const email = process.env.TAPO_EMAIL;
const pass = process.env.TAPO_PASS;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const ts = (): string => new Date().toLocaleTimeString('pt-BR');

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`✗ Falta a variável ${name}. Preencha o .env (veja docs/HARDWARE_SETUP.md).`);
    process.exit(1);
  }
  return value;
}

type TapoDevice = {
  getDeviceInfo: () => Promise<Record<string, unknown>>;
  getEnergyUsage: () => Promise<Record<string, number>>;
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
};

async function readState(device: TapoDevice, label: string): Promise<void> {
  try {
    const info = await device.getDeviceInfo();
    const on = info.device_on;
    let powerStr = '';
    try {
      const energy = await device.getEnergyUsage();
      const raw = energy.current_power ?? 0;
      // current_power costuma vir em mW no P110 → /1000 = W.
      powerStr = `  | potência: ${(raw / 1000).toFixed(2)} W (cru=${raw})`;
    } catch {
      powerStr = '  | (sem leitura de energia)';
    }
    console.log(`[${ts()}] ${label}: device_on=${String(on)}${powerStr}`);
  } catch (e) {
    console.log(`[${ts()}] ${label}: falha ao ler estado (${String(e)})`);
  }
}

async function main(): Promise<void> {
  requireEnv('TAPO_P110_IP', ip);
  requireEnv('TAPO_EMAIL', email);
  requireEnv('TAPO_PASS', pass);

  const { loginDeviceByIp } = await import('tp-link-tapo-connect');

  console.log(`→ [${ts()}] Autenticando na P110 (ip=${ip})...`);
  const device = (await loginDeviceByIp(email!, pass!, ip!)) as unknown as TapoDevice;
  console.log(`✓ [${ts()}] Autenticado.`);
  await readState(device, 'estado inicial');

  // ── Etapa 1: LIGA por 10s ───────────────────────────────────────────────
  console.log(`\n▶ [${ts()}] LIGANDO — manter por 10s`);
  await device.turnOn();
  await readState(device, 'ligada (t=0s)');
  await sleep(10_000);
  await readState(device, 'ligada (t=10s)');

  // ── Etapa 2: descanso 2s (desligada) ─────────────────────────────────────
  console.log(`\n⏸ [${ts()}] DESLIGANDO — descanso de 2s`);
  await device.turnOff();
  await readState(device, 'desligada');
  await sleep(2_000);

  // ── Etapa 3: LIGA por 20s ────────────────────────────────────────────────
  console.log(`\n▶ [${ts()}] LIGANDO — manter por 20s`);
  await device.turnOn();
  await readState(device, 'ligada (t=0s)');
  await sleep(20_000);
  await readState(device, 'ligada (t=20s)');

  // ── Fim: desliga (estado seguro conhecido) ───────────────────────────────
  console.log(`\n■ [${ts()}] FIM — desligando`);
  await device.turnOff();
  await readState(device, 'estado final');
  console.log(`✓ [${ts()}] Ciclo Tapo concluído.`);
}

main().catch((err) => {
  console.error(`✗ [${ts()}] Ciclo Tapo FALHOU:`, err);
  console.error('  Dicas: (1) IP certo? (app Tapo -> dispositivo -> engrenagem -> Info -> IP).');
  console.error('         (2) senha com caractere especial? teste com senha simples temporária.');
  console.error('         (3) tomada e hub na MESMA rede (LAN)?');
  process.exit(1);
});
