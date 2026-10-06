import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReactionDto } from './dto/create-reaction.dto';

export interface ReactionDetails {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReaction(
    kudosId: string,
    userId: string,
    dto: CreateReactionDto,
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
        data: {
          kudosId,
          userId,
          emoji: dto.emoji,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A reaction already exists for this member and kudos');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
