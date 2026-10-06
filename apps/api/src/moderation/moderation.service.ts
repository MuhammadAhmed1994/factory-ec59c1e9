import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';

export interface HideKudosResult {
  id: string;
  isHidden: true;
}

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async hideKudos(kudosId: string): Promise<HideKudosResult> {
    const existingKudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!existingKudos) {
      throw new NotFoundException('Kudos not found');
    }

    const hiddenKudos = await this.prisma.kudos.update({
      where: { id: kudosId },
      data: { isHidden: true },
      select: { id: true, isHidden: true },
    });
    this.boardEvents.publishKudosRemoved(hiddenKudos.id);

    return {
      id: hiddenKudos.id,
      isHidden: true,
    };
  }
}
