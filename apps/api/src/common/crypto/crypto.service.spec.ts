import { InternalServerErrorException } from '@nestjs/common';
import { CryptoService } from './crypto.service';

function make(key?: string): CryptoService {
  return new CryptoService({ get: () => key } as never);
}

describe('CryptoService', () => {
  it('faz round-trip encrypt → decrypt', () => {
    const svc = make('a'.repeat(64));
    const cipher = svc.encrypt('local_key_secreta');
    expect(cipher).not.toContain('local_key_secreta');
    expect(cipher.split(':')).toHaveLength(3);
    expect(svc.decrypt(cipher)).toBe('local_key_secreta');
  });

  it('gera cifras diferentes para o mesmo texto (IV aleatório)', () => {
    const svc = make('b'.repeat(64));
    expect(svc.encrypt('x')).not.toBe(svc.encrypt('x'));
  });

  it('rejeita chave ausente/curta', () => {
    expect(() => make(undefined)).toThrow(InternalServerErrorException);
    expect(() => make('curta')).toThrow(InternalServerErrorException);
  });

  it('rejeita payload corrompido', () => {
    const svc = make('c'.repeat(64));
    expect(() => svc.decrypt('formato-invalido')).toThrow(InternalServerErrorException);
  });
});
