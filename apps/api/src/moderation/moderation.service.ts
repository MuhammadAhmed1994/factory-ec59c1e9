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

  async hideKudos(id: string): Promise<HideKudosResult> {
    const result = await this.prisma.kudos.updateMany({
      where: { id },
      data: { isHidden: true },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Kudos with id ${id} was not found`);
    }

    this.boardEvents.publishKudosRemoved(id);
    return { id, isHidden: true };
  }
}
