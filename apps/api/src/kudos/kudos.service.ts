import { Injectable } from '@nestjs/common';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

export interface KudosPerson {
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
  author: KudosPerson;
  recipient: KudosPerson;
}

@Injectable()
export class KudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async createKudos(authorId: string, dto: CreateKudosDto): Promise<KudosDetails> {
    const created = (await this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: dto.recipientId,
        message: dto.message,
      },
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    })) as KudosDetails;

    this.boardEvents.publishKudosAdded({ id: created.id });
    return created;
  }

  async listKudos(page: number): Promise<KudosDetails[]> {
    return (await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    })) as KudosDetails[];
  }
}
