/**
 * spike: leitura local da tomada TP-Link Tapo P110.
 *
 * Lib verificada: `tp-link-tapo-connect` v2.0.15 (API v2). Suporta KLAP e o
 * protocolo legado (PASSTHROUGH) — `loginDeviceByIp` tenta KLAP e cai para o
 * legado automaticamente.
 *   - import { loginDeviceByIp } from 'tp-link-tapo-connect'
 *   - const device = await loginDeviceByIp(email, senha, ip)
 *   - await device.getDeviceInfo()    -> estado (device_on, nickname, ...)
 *   - await device.turnOn() / turnOff()
 *   - await device.getEnergyUsage()   -> { current_power, today_energy, month_energy,
 *                                          today_runtime, month_runtime, local_time }
 *
 * ⚠️ UNIDADES (o objetivo deste spike é CONFIRMAR empiricamente):
 *   - No protocolo cru do P110, `current_power` costuma vir em mW (milliwatts) —
 *     dividir por 1000 dá Watts. today_energy/month_energy costumam vir em Wh.
 *   - Este script imprime o valor CRU e a interpretação em W/kWh. Compare com um
 *     wattímetro ou com o app Tapo e ANOTE a unidade real no HARDWARE_SETUP.md.
 */
import 'dotenv/config';

const ip = process.env.TAPO_P110_IP;
const email = process.env.TAPO_EMAIL;
const pass = process.env.TAPO_PASS;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`✗ Falta a variável de ambiente ${name}. Preencha o .env (veja docs/HARDWARE_SETUP.md).`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  requireEnv('TAPO_P110_IP', ip);
  requireEnv('TAPO_EMAIL', email);
  requireEnv('TAPO_PASS', pass);

  // import dinâmico: a lib é CJS e tem efeitos colaterais; carregamos após validar env.
  const { loginDeviceByIp } = await import('tp-link-tapo-connect');

  console.log(`→ Autenticando na P110 (ip=${ip})...`);
  const device = await loginDeviceByIp(email!, pass!, ip!);
  console.log('✓ Autenticado.');

  const info = await device.getDeviceInfo();
  console.log('Estado:', JSON.stringify({ device_on: (info as Record<string, unknown>).device_on, nickname: (info as Record<string, unknown>).nickname }));

  const energy = (await device.getEnergyUsage()) as Record<string, number>;
  console.log('Leitura CRUA de energia:', JSON.stringify(energy));

  const rawPower = energy.current_power ?? 0;
  console.log('--- Interpretação (CONFIRME a unidade) ---');
  console.log(`  current_power (cru) = ${rawPower}`);
  console.log(`  se mW -> ${(rawPower / 1000).toFixed(2)} W   |   se já W -> ${rawPower} W`);
  console.log(`  today_energy (cru)  = ${energy.today_energy ?? 'n/a'}  (provável Wh -> ${((energy.today_energy ?? 0) / 1000).toFixed(3)} kWh)`);
  console.log(`  month_energy (cru)  = ${energy.month_energy ?? 'n/a'}  (provável Wh -> ${((energy.month_energy ?? 0) / 1000).toFixed(3)} kWh)`);

  console.log('✓ Spike Tapo concluído. ANOTE a unidade confirmada no HARDWARE_SETUP.md.');
}

main().catch((err) => {
  console.error('✗ Spike Tapo FALHOU:', err);
  console.error('  Dicas: (1) firmware antigo/novo? a v2 cobre KLAP+legado, confirme a versão da lib.');
  console.error('         (2) senha com caracteres especiais? teste com uma senha simples temporária.');
  console.error('         (3) IP errado? confira no app Tapo: dispositivo -> engrenagem -> Info -> IP.');
  process.exit(1);
});
