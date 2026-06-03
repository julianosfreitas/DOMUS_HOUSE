import { PrismaClient, DeviceType, Protocol, DeviceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = 'dev@casai.local';
  const passwordHash = await bcrypt.hash('Senha@123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Dev CASAI', passwordHash },
  });
  console.log(`✓ Usuário de teste: ${email} / Senha@123`);

  // 3 cômodos
  const roomData = [
    { name: 'Sala', order: 0 },
    { name: 'Quarto', order: 1 },
    { name: 'Cozinha', order: 2 },
  ];
  const rooms: Record<string, string> = {};
  for (const r of roomData) {
    const room = await prisma.room.upsert({
      where: { userId_name: { userId: user.id, name: r.name } },
      update: { order: r.order },
      create: { name: r.name, order: r.order, userId: user.id },
    });
    rooms[r.name] = room.id;
  }
  console.log('✓ Cômodos: Sala, Quarto, Cozinha');

  // Dispositivo MOCK LIGHT na Sala
  const existingLight = await prisma.device.findFirst({
    where: { userId: user.id, name: 'Luz da Sala (MOCK)' },
  });
  if (!existingLight) {
    await prisma.device.create({
      data: {
        name: 'Luz da Sala (MOCK)',
        type: DeviceType.LIGHT,
        protocol: Protocol.MOCK,
        status: DeviceStatus.ONLINE,
        supportsBrightness: true,
        supportsColor: true,
        supportsColorTemp: true,
        roomId: rooms['Sala'],
        userId: user.id,
        lastState: { on: false, brightness: 80 },
      },
    });
  }

  // Dispositivo MOCK PLUG (com energia) na Cozinha
  const existingPlug = await prisma.device.findFirst({
    where: { userId: user.id, name: 'Tomada da Cozinha (MOCK)' },
  });
  if (!existingPlug) {
    await prisma.device.create({
      data: {
        name: 'Tomada da Cozinha (MOCK)',
        type: DeviceType.PLUG,
        protocol: Protocol.MOCK,
        status: DeviceStatus.ONLINE,
        supportsEnergy: true,
        roomId: rooms['Cozinha'],
        userId: user.id,
        lastState: { on: true },
      },
    });
  }
  console.log('✓ Dispositivos MOCK: 1 LIGHT (Sala), 1 PLUG c/ energia (Cozinha)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✓ Seed concluído.');
  })
  .catch(async (e) => {
    console.error('✗ Seed falhou:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
