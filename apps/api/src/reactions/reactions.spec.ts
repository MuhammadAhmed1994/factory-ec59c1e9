import type { PrismaService } from '../prisma/prisma.service';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  it('[AC-7] a signed-in member can add a reaction and receives the created reaction', async () => {
    const createdReaction = {
      id: 'reaction-1',
      userId: 'member-1',
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    };
    const prisma = {
      kudos: { findUnique: jest.fn(async () => ({ id: 'kudos-1' })) },
      reaction: { create: jest.fn(async () => createdReaction) },
    } as unknown as PrismaService;
    const service = new ReactionsService(prisma);

    const result = await service.createReaction('kudos-1', 'member-1', '🎉');

    expect(prisma.reaction.create).toHaveBeenCalledWith({
      data: { kudosId: 'kudos-1', userId: 'member-1', emoji: '🎉' },
    });
    expect(result).toEqual(createdReaction);
  });
});
