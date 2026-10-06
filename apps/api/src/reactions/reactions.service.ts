import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReactionDetails {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaErrorLike {
  code?: unknown;
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReaction(
    kudosId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionDetails> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException(`Kudos '${kudosId}' was not found`);
    }

    try {
      return await this.prisma.reaction.create({
        data: { kudosId, userId, emoji },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A reaction from this member already exists for this kudos');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as PrismaErrorLike).code === 'P2002'
    );
  }
}
