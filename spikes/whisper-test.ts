/**
 * spike: transcrição de áudio pt-BR com Whisper rodando NO HUB (offline).
 *
 * Lib verificada: `nodejs-whisper` v0.2.x — bindings para whisper.cpp (CPU).
 *   - import { nodewhisper } from 'nodejs-whisper'
 *   - nodewhisper(filePath, { modelName, autoDownloadModelName, whisperOptions })
 *   - Converte o áudio para WAV 16kHz automaticamente. O modelo é baixado no
 *     primeiro uso (autoDownloadModelName).
 *
 * Modelo: usamos o do .env (WHISPER_MODEL, padrão 'small') porque pt-BR precisa
 * de pelo menos 'small' para boa acurácia. 'base' funciona, mas erra mais sotaque.
 *
 * Uso: coloque um arquivo de áudio pt-BR (ex: "ligar a luz da sala") e rode:
 *   AUDIO_FILE=./amostra.wav npx tsx whisper-test.ts
 */
import 'dotenv/config';
import path from 'node:path';
import { existsSync } from 'node:fs';

const audioFile = process.env.AUDIO_FILE ?? './amostra.wav';
const model = process.env.WHISPER_MODEL ?? 'small';
const language = process.env.WHISPER_LANGUAGE ?? 'pt';

async function main(): Promise<void> {
  const filePath = path.resolve(audioFile);
  if (!existsSync(filePath)) {
    console.error(`✗ Arquivo de áudio não encontrado: ${filePath}`);
    console.error('  Grave uma amostra pt-BR (ex: "ligar a luz da sala") e aponte AUDIO_FILE para ela.');
    process.exit(1);
  }

  const { nodewhisper } = await import('nodejs-whisper');

  console.log(`→ Transcrevendo "${filePath}" com modelo "${model}" (idioma=${language})...`);
  const started = Date.now();

  const result = await nodewhisper(filePath, {
    modelName: model,
    autoDownloadModelName: model,
    whisperOptions: { outputInText: false, language },
  });

  const elapsedMs = Date.now() - started;
  console.log('Transcrição:', result);
  console.log(`⏱  Tempo: ${elapsedMs} ms (${(elapsedMs / 1000).toFixed(2)} s)`);

  if (elapsedMs < 2000) {
    console.log('✓ Latência < 2s — dentro da meta do TCC.');
  } else {
    console.log('⚠ Latência ≥ 2s. Considere modelo menor, GPU, ou faster-whisper (Python) no hub.');
  }
  console.log('✓ Spike Whisper concluído.');
}

main().catch((err) => {
  console.error('✗ Spike Whisper FALHOU:', err);
  console.error('  Dicas: (1) primeira execução baixa o modelo e compila whisper.cpp — pode demorar.');
  console.error('         (2) precisa de build tools (make/cmake) instalados para compilar whisper.cpp.');
  process.exit(1);
});
