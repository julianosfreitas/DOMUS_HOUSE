import { PartialType } from '@nestjs/mapped-types';
import { CreateAutomationDto } from './automation.types';

export class UpdateAutomationDto extends PartialType(CreateAutomationDto) {}
