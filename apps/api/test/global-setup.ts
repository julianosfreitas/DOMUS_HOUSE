import { config } from 'dotenv';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Roda UMA vez antes da suíte e2e: aplica as migrations no banco de TESTE.
 * Isola os testes do banco de desenvolvimento (TEST_DATABASE_URL → casai_test).
 */
export default function globalSetup(): void {
  config({ path: resolve(__dirname, '..', '.env') });
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL não definido — configure o .env');
  }
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
