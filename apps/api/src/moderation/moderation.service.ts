import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async hideKudos(kudosId: string): Promise<void> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });

    if (!kudos) {
      throw new NotFoundException(`Kudos ${kudosId} was not found`);
    }

    await this.prisma.kudos.update({
      where: { id: kudosId },
      data: { isHidden: true },
    });
    this.boardEvents.publishKudosRemoved(kudosId);
  }
}
