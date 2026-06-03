/**
 * spike: controle local da lâmpada Intelbras EWS 410 (ecossistema Tuya)
 *
 * Lib verificada: `tuyapi` v7.7.0 (jan/2025) — classe TuyAPI.
 *   - new TuyAPI({ id, key, ip, version })  // version = '3.3' | '3.4' | '3.5'
 *   - device.find()      -> descobre o IP via broadcast (opcional se já temos o IP)
 *   - device.connect()   -> abre conexão TCP local persistente
 *   - device.get({ schema:true }) / device.get()  -> lê o estado (DPS)
 *   - device.set({ dps, set }) ou device.set({ multiple:true, data:{...} })
 *   - eventos: 'connected', 'data', 'disconnected', 'error'
 *   Na EWS 410 o DPS '1' é o liga/desliga (boolean). Brilho costuma ser '2'/'3'.
 *
 * COMO OBTER A local_key (resumo — detalhes em docs/HARDWARE_SETUP.md):
 *   1. Lâmpada já pareada no app Izy/Smart Life, no Wi-Fi 2.4GHz.
 *   2. Crie conta e Cloud Project (Smart Home) em iot.tuya.com.
 *   3. Devices -> Link Tuya App Account -> escaneie o QR no app.
 *   4. Atalho: `npm i -g @tuyapi/cli` e `tuya-cli wizard` -> ele lista id, key e ip.
 *   ⚠️ A local_key MUDA toda vez que você remove/re-adiciona a lâmpada no app.
 *   ⚠️ A lâmpada aceita só UMA conexão local por vez — feche o app antes de testar.
 */
import 'dotenv/config';
import TuyAPI from 'tuyapi';

const id = process.env.TUYA_EWS410_ID;
const key = process.env.TUYA_EWS410_KEY;
const ip = process.env.TUYA_EWS410_IP;
const version = process.env.TUYA_PROTOCOL_VERSION ?? '3.3';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`✗ Falta a variável de ambiente ${name}. Preencha o .env (veja docs/HARDWARE_SETUP.md).`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  requireEnv('TUYA_EWS410_ID', id);
  requireEnv('TUYA_EWS410_KEY', key);
  requireEnv('TUYA_EWS410_IP', ip);

  console.log(`→ Conectando na EWS 410 (ip=${ip}, protocolo=${version})...`);
  const device = new TuyAPI({ id: id!, key: key!, ip: ip!, version });

  device.on('error', (err) => console.error('✗ Erro do dispositivo:', err));
  device.on('disconnected', () => console.log('… desconectado'));

  await device.connect();
  console.log('✓ Conectado.');

  const before = await device.get({ schema: true });
  console.log('Estado inicial (DPS):', JSON.stringify(before));

  console.log('→ Ligando (dps 1 = true)...');
  await device.set({ dps: 1, set: true });
  await sleep(2000);

  console.log('→ Desligando (dps 1 = false)...');
  await device.set({ dps: 1, set: false });

  const after = await device.get({ schema: true });
  console.log('Estado final (DPS):', JSON.stringify(after));

  device.disconnect();
  console.log('✓ Spike Tuya concluído. Se a lâmpada acendeu e apagou, o controle local funciona.');
  console.log(`✓ Anote no HARDWARE_SETUP.md: protocolo que funcionou = ${version}`);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

main().catch((err) => {
  console.error('✗ Spike Tuya FALHOU:', err);
  console.error('  Dicas: (1) protocolo errado? tente 3.4/3.5 em TUYA_PROTOCOL_VERSION.');
  console.error('         (2) local_key desatualizada? re-obtenha via tuya-cli wizard.');
  console.error('         (3) app aberto segurando a conexão? feche o Izy/Smart Life.');
  process.exit(1);
});
