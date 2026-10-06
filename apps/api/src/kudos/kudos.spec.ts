import { validate } from 'class-validator';
import { BoardEventsService } from '../common/events/board-events.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosDetails, KudosService } from './kudos.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

type MockPrisma = {
  user: { findUnique: any };
  kudos: { create: any; findMany: any };
};

function createPrismaMock(): MockPrisma {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'recipient-1' }) },
    kudos: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function validKudos(): KudosDetails {
  return {
    id: 'kudos-1',
    authorId: 'member-1',
    recipientId: 'recipient-1',
    message: 'Thank you for your help!',
    isHidden: false,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  };
}

describe('KudosService', () => {
  let prisma: MockPrisma;
  let boardEvents: BoardEventsService;
  let service: KudosService;

  beforeEach(() => {
    prisma = createPrismaMock();
    boardEvents = new BoardEventsService();
    service = new KudosService(prisma as never, boardEvents);
  });

  it('[AC-3] creates member kudos and rejects messages over 280 characters', async () => {
    const kudos = validKudos();
    prisma.kudos.create.mockResolvedValue(kudos);
    const input = Object.assign(new CreateKudosDto(), {
      recipientId: 'recipient-1',
      message: 'x'.repeat(280),
    });

    expect(await validate(input)).toHaveLength(0);
    await expect(
      validate(
        Object.assign(new CreateKudosDto(), {
          recipientId: 'recipient-1',
          message: 'x'.repeat(281),
        }),
      ),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'message' })]),
    );

    await expect(service.createKudos('member-1', input)).resolves.toEqual(kudos);
    expect(prisma.kudos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          authorId: 'member-1',
          recipientId: 'recipient-1',
          message: 'x'.repeat(280),
        },
      }),
    );
  });

  it('[AC-5] returns only visible kudos in deterministic 20-item pages', async () => {
    const page = Array.from({ length: 20 }, (_, index) => ({
      ...validKudos(),
      id: `kudos-${index}`,
    }));
    prisma.kudos.findMany.mockResolvedValue(page);

    await expect(service.listVisibleKudos(2)).resolves.toEqual(page);
    expect(prisma.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isHidden: false },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
  });

  it('[AC-6] emits a newly created kudos to connected event subscribers', async () => {
    const kudos = validKudos();
    prisma.kudos.create.mockResolvedValue(kudos);
    const subscriber = jest.fn();
    const subscription = service.getEvents().subscribe(subscriber);

    await service.createKudos('member-1', {
      recipientId: 'recipient-1',
      message: kudos.message,
    });

    expect(subscriber).toHaveBeenCalledWith({
      type: 'kudos-added',
      data: { type: 'added', kudos: { id: 'kudos-1' } },
    });
    subscription.unsubscribe();
  });
});
