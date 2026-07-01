import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TtsSpeakDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsString()
  profileId?: string;
}
