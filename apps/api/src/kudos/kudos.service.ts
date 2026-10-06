import { BadRequestException, Injectable } from '@nestjs/common';
import { BoardEventsService } from '../common/events/board-events.service';
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

export interface CreateKudosInput {
  recipientId: string;
  message: string;
}

@Injectable()
export class KudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  async create(authorId: string, input: CreateKudosInput): Promise<KudosRecord> {
    const recipient = await this.prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true },
    });
    if (!recipient) {
      throw new BadRequestException('recipientId must identify a valid member');
    }

    const kudos = (await this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: input.recipientId,
        message: input.message,
      },
    })) as KudosRecord;

    this.boardEvents.publishKudosAdded({ id: kudos.id });
    return kudos;
  }

  async listVisible(page: number = 1): Promise<KudosRecord[]> {
    return (await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
    })) as KudosRecord[];
  }
}
