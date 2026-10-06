import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  BoardEvent,
  BoardEventsService,
} from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

const KUDOS_PAGE_SIZE = 20;

export interface KudosDetails {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class KudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async createKudos(authorId: string, input: CreateKudosDto): Promise<KudosDetails> {
    const recipient = await this.prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true },
    });
    if (!recipient) {
      throw new UnprocessableEntityException(
        'recipientId must identify a valid member',
      );
    }

    const kudos = (await this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: input.recipientId,
        message: input.message,
      },
      select: {
        id: true,
        authorId: true,
        recipientId: true,
        message: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as KudosDetails;

    this.boardEvents.publishKudosAdded({ id: kudos.id });
    return kudos;
  }

  async listVisibleKudos(page: number = 1): Promise<KudosDetails[]> {
    return (await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * KUDOS_PAGE_SIZE,
      take: KUDOS_PAGE_SIZE,
      select: {
        id: true,
        authorId: true,
        recipientId: true,
        message: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as KudosDetails[];
  }

  getEvents(): Observable<BoardEvent> {
    return this.boardEvents.getEvents();
  }
}
