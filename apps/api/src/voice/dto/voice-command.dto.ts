import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoiceCommandTextDto {
  // Texto já transcrito (atalho sem áudio) — útil para testes e clientes texto.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  text?: string;
}
