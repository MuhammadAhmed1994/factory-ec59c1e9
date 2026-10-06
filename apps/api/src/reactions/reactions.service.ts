import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReactionDetails {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaErrorWithCode {
  code?: unknown;
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    kudosId: string,
    emoji: string,
  ): Promise<ReactionDetails> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });

    if (!kudos) {
      throw new NotFoundException('Kudos not found');
    }

    try {
      return await this.prisma.reaction.create({
        data: { userId, kudosId, emoji },
      });
    } catch (error: unknown) {
      const code = (error as PrismaErrorWithCode | null)?.code;
      if (code === 'P2002') {
        throw new ConflictException('A reaction has already been added to this kudos');
      }
      if (code === 'P2003') {
        throw new NotFoundException('Kudos or member not found');
      }
      throw error;
    }
  }
}
