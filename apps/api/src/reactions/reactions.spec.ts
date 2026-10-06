import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReactionsController', () => {
  it('[AC-7] allows a signed-in member to add a reaction and returns the created reaction', async () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const createdReaction = {
      id: 'reaction-1',
      userId: 'member-1',
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt,
      updatedAt: createdAt,
    };
    const prisma = {
      kudos: {
        findUnique: jest.fn().mockResolvedValue({ id: 'kudos-1' }),
      },
      reaction: {
        create: jest.fn().mockResolvedValue(createdReaction),
      },
    };
    const service = new ReactionsService(prisma as unknown as PrismaService);
    const controller = new ReactionsController(service);
    const input: CreateReactionDto = { emoji: '🎉' };

    const response = await controller.createReaction('kudos-1', input, 'member-1');

    expect(response).toEqual(createdReaction);
    expect(prisma.reaction.create).toHaveBeenCalledWith({
      data: { userId: 'member-1', kudosId: 'kudos-1', emoji: '🎉' },
      select: {
        id: true,
        userId: true,
        kudosId: true,
        emoji: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
});
