import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReactionDto } from './dto/create-reaction.dto';

export interface ReactionDetails {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
}

interface PrismaUniqueConstraintError {
  code: string;
}

function isUniqueConstraintError(error: unknown): error is PrismaUniqueConstraintError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    kudosId: string,
    userId: string,
    createReactionDto: CreateReactionDto,
  ): Promise<ReactionDetails> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException(`Kudos ${kudosId} was not found`);
    }

    try {
      return (await this.prisma.reaction.create({
        data: {
          userId,
          kudosId,
          emoji: createReactionDto.emoji,
        },
        select: {
          id: true,
          userId: true,
          kudosId: true,
          emoji: true,
          createdAt: true,
        },
      })) as ReactionDetails;
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A reaction already exists for this member and kudos');
      }
      throw error;
    }
  }
}
