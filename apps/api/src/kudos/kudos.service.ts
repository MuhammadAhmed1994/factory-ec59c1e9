import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BoardEvent, BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

export interface KudosMemberSummary {
  id: string;
  name: string;
}

export interface KudosDetails {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: KudosMemberSummary;
  recipient: KudosMemberSummary;
}

export type KudosBoardItem = KudosDetails;

@Injectable()
export class KudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async createKudos(authorId: string, details: CreateKudosDto): Promise<KudosDetails> {
    const created = (await this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: details.recipientId,
        message: details.message,
      },
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    })) as KudosDetails;

    this.boardEvents.publishKudosAdded({ id: created.id });
    return created;
  }

  async getKudos(page = 1): Promise<KudosBoardItem[]> {
    return (await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    })) as KudosBoardItem[];
  }

  getBoardEvents(): Observable<BoardEvent> {
    return this.boardEvents.getEvents();
  }

  publishKudosRemoved(kudosId: string): void {
    this.boardEvents.publishKudosRemoved(kudosId);
  }
}
