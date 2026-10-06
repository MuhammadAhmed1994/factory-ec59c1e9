import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BoardEventsService, BoardEvent } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto, KudosPageQueryDto } from './dto/create-kudos.dto';
import { KudosService, KudosRecord } from './kudos.service';

describe('KudosService', () => {
  const created: KudosRecord = {
    id: 'kudos-1',
    authorId: 'member-1',
    recipientId: 'member-2',
    message: 'Thank you for your help!',
    isHidden: false,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  };

  it('[AC-3] creates kudos for the signed-in member and rejects invalid or overlong messages', async () => {
    const prisma = {
      kudos: {
        create: jest.fn().mockResolvedValue(created),
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;
    const events = new BoardEventsService();
    const service = new KudosService(prisma, events);

    const input = plainToInstance(CreateKudosDto, {
      recipientId: 'member-2',
      message: 'Thank you for your help!',
    });
    const invalidInput = plainToInstance(CreateKudosDto, {
      recipientId: 'member-2',
      message: 'x'.repeat(281),
    });
    const missingFields = plainToInstance(CreateKudosDto, {});

    await expect(validate(input)).resolves.toHaveLength(0);
    await expect(validate(invalidInput)).resolves.toHaveLength(1);
    await expect(validate(missingFields)).resolves.toHaveLength(2);
    await expect(service.createKudos(input.recipientId, 'member-1', input.message)).resolves.toEqual(created);
    expect(prisma.kudos.create).toHaveBeenCalledWith({
      data: { recipientId: 'member-2', authorId: 'member-1', message: input.message },
    });
  });

  it('[AC-5] returns visible kudos in deterministic pages of at most 20', async () => {
    const prisma = {
      kudos: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([created]),
      },
    } as unknown as PrismaService;
    const service = new KudosService(prisma, new BoardEventsService());
    const query = plainToInstance(KudosPageQueryDto, { page: '2' });

    await expect(validate(query)).resolves.toHaveLength(0);
    await expect(service.getKudosPage(query.page)).resolves.toEqual({
      kudos: [created],
      page: 2,
      pageSize: 20,
    });
    expect(prisma.kudos.findMany).toHaveBeenCalledWith({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 20,
    });
    const invalidPage = plainToInstance(KudosPageQueryDto, { page: '0' });
    await expect(validate(invalidPage)).resolves.toHaveLength(1);
  });

  it('[AC-6] emits newly created kudos to connected event-stream subscribers', async () => {
    const prisma = {
      kudos: {
        create: jest.fn().mockResolvedValue(created),
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;
    const events = new BoardEventsService();
    const service = new KudosService(prisma, events);
    const received: BoardEvent[] = [];
    const subscription = service.getBoardEvents().subscribe((event) => received.push(event));

    await service.createKudos(created.recipientId, created.authorId, created.message);

    expect(received).toEqual([
      { type: 'kudos-added', data: { type: 'added', kudos: { id: created.id } } },
    ]);
    subscription.unsubscribe();
  });
});
