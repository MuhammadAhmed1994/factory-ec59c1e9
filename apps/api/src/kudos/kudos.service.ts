import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BoardEvent, BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

export const KUDOS_PAGE_SIZE = 20;

export interface KudosPersonDetails {
  id: string;
  name: string;
}

export interface KudosReactionDetails {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
}

export interface KudosDetails {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: KudosPersonDetails;
  recipient: KudosPersonDetails;
  reactions: KudosReactionDetails[];
}

@Injectable()
export class KudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async createKudos(authorId: string, input: CreateKudosDto): Promise<KudosDetails> {
    const kudos = (await this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: input.recipientId,
        message: input.message,
      },
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
        reactions: true,
      },
    })) as KudosDetails;

    this.boardEvents.publishKudosAdded({ id: kudos.id });
    return kudos;
  }

  async listVisibleKudos(page: number): Promise<KudosDetails[]> {
    return (await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * KUDOS_PAGE_SIZE,
      take: KUDOS_PAGE_SIZE,
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
        reactions: true,
      },
    })) as KudosDetails[];
  }

  getBoardEvents(): Observable<BoardEvent> {
    return this.boardEvents.getEvents();
  }
}
