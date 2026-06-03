// Declaração mínima para `nodejs-whisper` (dependência OPCIONAL, carregada por
// import dinâmico). Permite compilar sem a lib nativa instalada; em runtime, se
// ausente, o WhisperSttService trata o erro e responde 503.
declare module 'nodejs-whisper' {
  export function nodewhisper(
    filePath: string,
    options: {
      modelName: string;
      autoDownloadModelName?: string;
      whisperOptions?: Record<string, unknown>;
    },
  ): Promise<string>;
}
