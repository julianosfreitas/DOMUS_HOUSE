import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto, UpdateSceneDto } from './scene.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('scenes')
export class ScenesController {
  constructor(private readonly scenes: ScenesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.scenes.list(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scenes.get(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSceneDto) {
    return this.scenes.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSceneDto) {
    return this.scenes.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scenes.remove(user.id, id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scenes.activate(user.id, id);
  }
}
