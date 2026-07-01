// Acha a Tomada Tapo P110 na LAN (KLAP, creds do .env), LIGA e DEIXA ligada.
// Uso: node spikes/tapo-on.mjs [ip1,ip2,...]   (sem arg = varre hosts vivos via ARP)
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';

const ROOT = '/Users/julianofreitas/Desktop/tcc/casai_tcc';
const require = createRequire(ROOT + '/apps/api/');
const { loginDeviceByIp } = require('tp-link-tapo-connect');

const env = {};
for (const l of fs.readFileSync(ROOT + '/.env', 'utf8').split('\n')) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue;
  const i = l.indexOf('='); env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const EMAIL = env.TAPO_EMAIL, PASS = env.TAPO_PASS;

let cands = (process.argv[2] || '').split(',').filter(Boolean);
if (!cands.length) {
  try {
    const arp = execSync('arp -an', { encoding: 'utf8' });
    cands = [...new Set([env.TAPO_P110_IP, '192.168.25.61', '192.168.25.70',
      ...([...arp.matchAll(/192\.168\.25\.(\d+)/g)].map(m => '192.168.25.' + m[1]))])]
      .filter(Boolean).filter(ip => !/\.(1|63|255)$/.test(ip));
  } catch { cands = [env.TAPO_P110_IP]; }
}
const nick = (n) => { try { return Buffer.from(n || '', 'base64').toString('utf8') || n; } catch { return n; } };
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
const ms = () => Number(process.hrtime.bigint() / 1000000n);

console.log(`varrendo ${cands.length} candidatos (timeout 15s, concorrente)...`);
const results = await Promise.all(cands.map(async (ip) => {
  try {
    const dev = await withTimeout(loginDeviceByIp(EMAIL, PASS, ip), 15000);
    const info = await withTimeout(dev.getDeviceInfo(), 6000);
    return { ip, dev, info, ok: true };
  } catch (e) { return { ip, ok: false, err: String(e.message || e).split('\n')[0] }; }
}));

for (const r of results) if (r.ok) console.log(`  ✓ LOGIN ${r.ip}  model=${r.info.model}  nome=${nick(r.info.nickname)}  on=${r.info.device_on}`);
const tapos = results.filter(r => r.ok);
if (!tapos.length) {
  console.log('\n❌ Nenhum device Tapo autenticou. Motivos por IP (não-triviais):');
  for (const r of results.filter(x => !x.ok && !/ECONNREFUSED|404/.test(x.err))) console.log(`   ${r.ip}: ${r.err}`);
  process.exit(2);
}
// prefere P110; senão primeiro que logou
const chosen = tapos.find(r => /P110/i.test(r.info.model)) || tapos[0];
const t0 = ms();
await withTimeout(chosen.dev.turnOn(), 8000);
const after = await withTimeout(chosen.dev.getDeviceInfo(), 6000);
console.log(`\n✅ LIGADA (LOCAL/KLAP) em ${chosen.ip}  model=${after.model}  nome=${nick(after.nickname)}`);
console.log(`   device_on: ${chosen.info.device_on} -> ${after.device_on}  |  latência turnOn ${ms() - t0} ms`);
console.log('   deixada LIGADA.');
