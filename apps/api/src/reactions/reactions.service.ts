import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    input: CreateReactionDto,
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
          userId,
          kudosId,
          emoji: input.emoji,
        },
        select: {
          id: true,
          userId: true,
          kudosId: true,
          emoji: true,
          createdAt: true,
          updatedAt: true,
        },
      }) as ReactionDetails;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A reaction already exists for this member and kudos');
      }
      throw error;
    }
  }
}
