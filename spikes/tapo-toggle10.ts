/**
 * spike: TESTE DE CONFIABILIDADE da Tapo P110 — liga/desliga 10x e confere o estado.
 *
 * Para cada ciclo: turnOn -> lê (espera device_on=true) -> turnOff -> lê (espera false).
 * Conta sucessos e mede latência média do comando. Sai com código != 0 se algum falhar.
 *
 * Rodar:  cd spikes && TAPO_P110_IP=... TAPO_EMAIL=... TAPO_PASS=... npm run tapo:toggle10
 * (ou preencha o .env da raiz — o script o carrega de spikes/../.env)
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env') });

const ip = process.env.TAPO_P110_IP;
const email = process.env.TAPO_EMAIL;
const pass = process.env.TAPO_PASS;

const CYCLES = 10;
const SETTLE_MS = 800; // espera o device aplicar antes de reler
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`✗ Falta a variável ${name}. Preencha o .env (veja docs/HARDWARE_SETUP.md).`);
    process.exit(1);
  }
  return value;
}

type TapoDevice = {
  getDeviceInfo: () => Promise<Record<string, unknown>>;
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
};

async function isOn(device: TapoDevice): Promise<boolean> {
  const info = await device.getDeviceInfo();
  return Boolean(info.device_on);
}

async function main(): Promise<void> {
  requireEnv('TAPO_P110_IP', ip);
  requireEnv('TAPO_EMAIL', email);
  requireEnv('TAPO_PASS', pass);

  const { loginDeviceByIp } = await import('tp-link-tapo-connect');
  console.log(`→ Autenticando na P110 (ip=${ip})...`);
  const device = (await loginDeviceByIp(email!, pass!, ip!)) as unknown as TapoDevice;
  console.log(`✓ Autenticado. Iniciando ${CYCLES} ciclos liga/desliga.\n`);

  let okOn = 0;
  let okOff = 0;
  const latencies: number[] = [];

  for (let i = 1; i <= CYCLES; i++) {
    // LIGAR
    let t = Date.now();
    await device.turnOn();
    latencies.push(Date.now() - t);
    await sleep(SETTLE_MS);
    const on = await isOn(device);
    if (on) okOn++;

    // DESLIGAR
    t = Date.now();
    await device.turnOff();
    latencies.push(Date.now() - t);
    await sleep(SETTLE_MS);
    const off = !(await isOn(device));
    if (off) okOff++;

    console.log(
      `ciclo ${String(i).padStart(2)}/${CYCLES}: ligar=${on ? '✓' : '✗'}  desligar=${off ? '✓' : '✗'}`,
    );
  }

  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const pass2 = okOn === CYCLES && okOff === CYCLES;
  console.log(`\n── Resumo ──`);
  console.log(`  ligar  OK: ${okOn}/${CYCLES}`);
  console.log(`  desligar OK: ${okOff}/${CYCLES}`);
  console.log(`  latência média do comando: ${avg} ms`);
  console.log(pass2 ? '✓ APROVADO — 10/10 liga e desliga confiável.' : '✗ FALHOU — ver ciclos acima.');
  process.exit(pass2 ? 0 : 1);
}

main().catch((err) => {
  console.error('✗ Teste 10x FALHOU:', err?.message ?? err);
  console.error('  Se ECONNREFUSED: rede bloqueando (cheque rotas reject do Tailscale).');
  process.exit(1);
});
