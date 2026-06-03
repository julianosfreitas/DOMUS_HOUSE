import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Scene } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionsRunner, type ActionResult } from '../automations/actions-runner';
import type { AutomationActionDto } from '../automations/automation.types';
import type { CreateSceneDto, UpdateSceneDto } from './scene.dto';

@Injectable()
export class ScenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: ActionsRunner,
  ) {}

  list(userId: string): Promise<Scene[]> {
    return this.prisma.scene.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async get(userId: string, id: string): Promise<Scene> {
    const scene = await this.prisma.scene.findFirst({ where: { id, userId } });
    if (!scene) {
      throw new NotFoundException('Cena não encontrada');
    }
    return scene;
  }

  create(userId: string, dto: CreateSceneDto): Promise<Scene> {
    return this.prisma.scene.create({
      data: {
        userId,
        name: dto.name,
        icon: dto.icon ?? null,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateSceneDto): Promise<Scene> {
    await this.get(userId, id);
    return this.prisma.scene.update({
      where: { id },
      data: {
        name: dto.name,
        icon: dto.icon,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.get(userId, id);
    await this.prisma.scene.delete({ where: { id } });
    return { ok: true };
  }

  /** Ativa a cena: executa as ações em ordem, respeitando delaySeconds. */
  async activate(userId: string, id: string): Promise<{ results: ActionResult[] }> {
    const scene = await this.get(userId, id);
    const actions = (scene.actions as unknown as AutomationActionDto[]) ?? [];
    const results = await this.runner.run(userId, actions);
    return { results };
  }
}
