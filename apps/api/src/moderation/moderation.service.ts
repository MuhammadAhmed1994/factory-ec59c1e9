import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';

export interface HideKudosResult {
  id: string;
  isHidden: boolean;
}

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async hideKudos(id: string): Promise<HideKudosResult> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException('Kudos not found');
    }

    const hiddenKudos = await this.prisma.kudos.update({
      where: { id },
      data: { isHidden: true },
      select: { id: true, isHidden: true },
    });
    this.boardEvents.publishKudosRemoved(hiddenKudos.id);
    return hiddenKudos;
  }
}
