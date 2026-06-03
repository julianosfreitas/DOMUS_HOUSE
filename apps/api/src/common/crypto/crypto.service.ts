import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from 'node:crypto';

/**
 * Criptografia de segredos de dispositivo (local_key Tuya, senha Tapo) com
 * AES-256-GCM. A chave vem de CASAI_ENCRYPTION_KEY (32 bytes em hex).
 *
 * Formato armazenado: `${ivHex}:${authTagHex}:${cipherHex}`.
 * NUNCA logamos o texto puro nem a chave.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;
  private static readonly ALGO = 'aes-256-gcm';
  private static readonly IV_BYTES = 12; // recomendado para GCM

  constructor(config: ConfigService) {
    const hex = config.get<string>('CASAI_ENCRYPTION_KEY');
    if (!hex || hex.length !== 64) {
      throw new InternalServerErrorException(
        'CASAI_ENCRYPTION_KEY ausente ou inválida (esperado 32 bytes = 64 hex).',
      );
    }
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(CryptoService.IV_BYTES);
    const cipher = createCipheriv(CryptoService.ALGO, this.key, iv) as CipherGCM;
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      // Não logamos o payload para não vazar material criptográfico.
      this.logger.error('Payload cifrado em formato inválido');
      throw new InternalServerErrorException('Segredo de dispositivo corrompido');
    }
    const decipher = createDecipheriv(
      CryptoService.ALGO,
      this.key,
      Buffer.from(ivHex, 'hex'),
    ) as DecipherGCM;
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  }
}
