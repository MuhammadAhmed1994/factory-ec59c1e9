import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReactionDto } from './dto/create-reaction.dto';

export interface ReactionResponse {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReaction(
    kudosId: string,
    userId: string,
    dto: CreateReactionDto,
  ): Promise<ReactionResponse> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });

    if (!kudos) {
      throw new NotFoundException(`Kudos ${kudosId} was not found`);
    }

    try {
      return await this.prisma.reaction.create({
        data: {
          kudosId,
          userId,
          emoji: dto.emoji,
        },
        select: {
          id: true,
          userId: true,
          kudosId: true,
          emoji: true,
          createdAt: true,
        },
      }) as ReactionResponse;
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
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
