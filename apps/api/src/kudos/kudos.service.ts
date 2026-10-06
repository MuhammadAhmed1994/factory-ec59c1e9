import { Injectable } from '@nestjs/common';
import { BoardEventsService, BoardEvent } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';

export interface KudosRecord {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KudosPage {
  kudos: KudosRecord[];
  page: number;
  pageSize: number;
}

@Injectable()
export class KudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async createKudos(recipientId: string, authorId: string, message: string): Promise<KudosRecord> {
    const kudos = (await this.prisma.kudos.create({
      data: { recipientId, authorId, message },
    })) as KudosRecord;
    this.boardEvents.publishKudosAdded({ id: kudos.id });
    return kudos;
  }

  async getKudosPage(page = 1): Promise<KudosPage> {
    const pageSize = 20;
    const kudos = (await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })) as KudosRecord[];
    return { kudos, page, pageSize };
  }

  getBoardEvents(): import('rxjs').Observable<BoardEvent> {
    return this.boardEvents.getEvents();
  }
}
