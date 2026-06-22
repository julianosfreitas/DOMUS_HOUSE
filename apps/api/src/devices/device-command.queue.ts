import { Injectable } from '@nestjs/common';

/**
 * Fila serializada POR dispositivo. Comandos ao mesmo deviceId são processados
 * em série (nunca em paralelo) — um dispositivo Tuya aceita só UMA conexão local
 * por vez (CLAUDE.md / Passo 4). Comandos a dispositivos diferentes correm em paralelo.
 */
@Injectable()
export class DeviceCommandQueue {
  private readonly chains = new Map<string, Promise<unknown>>();

  enqueue<T>(deviceId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(deviceId) ?? Promise.resolve();
    // Encadeia após o anterior, ignorando a rejeição dele para não travar a fila.
    const next = previous.then(task, task);
    // O elo guardado nunca rejeita, senão um erro pararia toda a fila do dispositivo.
    const link = next.then(
      () => undefined,
      () => undefined,
    );
    this.chains.set(deviceId, link);
    // Quando este elo terminar, se ainda for a CAUDA da fila (nenhum enqueue novo
    // o substituiu), remove a entrada do Map — senão deviceIds vazam para sempre
    // (inclusive de dispositivos já removidos).
    void link.then(() => {
      if (this.chains.get(deviceId) === link) {
        this.chains.delete(deviceId);
      }
    });
    return next;
  }

  /** Há comando em andamento/enfileirado para este device? (agora preciso: o Map
   *  é limpo quando a fila esvazia.) */
  hasPending(deviceId: string): boolean {
    return this.chains.has(deviceId);
  }
}
