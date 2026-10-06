import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BoardEvent, BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto, KudosPageQueryDto } from './dto/create-kudos.dto';
import { KudosController } from './kudos.controller';
import { KudosDetails, KudosService } from './kudos.service';

const makeKudos = (id: string, message = 'Thank you!'): KudosDetails => ({
  id,
  authorId: 'member-1',
  recipientId: 'member-2',
  message,
  isHidden: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  author: { id: 'member-1', name: 'Alex' },
  recipient: { id: 'member-2', name: 'Sam' },
  reactions: [],
});

describe('Kudos endpoints', () => {
  it('[AC-3] creates member kudos and validates the 280-character limit', async () => {
    const created = makeKudos('kudos-1');
    const create = jest.fn<Promise<KudosDetails>, unknown[]>().mockResolvedValue(created);
    const prisma = { kudos: { create } } as unknown as PrismaService;
    const boardEvents = new BoardEventsService();
    const service = new KudosService(prisma, boardEvents);

    const input = plainToInstance(CreateKudosDto, {
      recipientId: 'member-2',
      message: 'Thank you!',
    });
    expect(await validate(input)).toHaveLength(0);
    expect(await service.createKudos('member-1', input)).toEqual(created);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: { authorId: 'member-1', recipientId: 'member-2', message: 'Thank you!' },
    }));

    const tooLong = plainToInstance(CreateKudosDto, {
      recipientId: 'member-2',
      message: 'x'.repeat(281),
    });
    expect((await validate(tooLong)).some((error) => error.property === 'message')).toBe(true);

    const missingRecipient = plainToInstance(CreateKudosDto, { message: 'Thanks' });
    expect((await validate(missingRecipient)).some((error) => error.property === 'recipientId')).toBe(true);
  });

  it('[AC-5] queries only visible kudos with deterministic newest-first pagination', async () => {
    const rows = [makeKudos('kudos-z'), makeKudos('kudos-y')];
    const findMany = jest.fn<Promise<KudosDetails[]>, unknown[]>().mockResolvedValue(rows);
    const prisma = { kudos: { findMany } } as unknown as PrismaService;
    const service = new KudosService(prisma, new BoardEventsService());
    const query = plainToInstance(KudosPageQueryDto, { page: '2' });

    expect(await validate(query)).toHaveLength(0);
    expect(query.page).toBe(2);
    expect(await service.listVisibleKudos(query.page)).toEqual(rows);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 20,
    }));

    const invalidPage = plainToInstance(KudosPageQueryDto, { page: '0' });
    expect((await validate(invalidPage)).some((error) => error.property === 'page')).toBe(true);
  });

  it('[AC-6] broadcasts a newly created kudos to connected event-stream subscribers', async () => {
    const boardEvents = new BoardEventsService();
    const create = jest.fn<Promise<KudosDetails>, unknown[]>().mockResolvedValue(makeKudos('kudos-live'));
    const prisma = { kudos: { create } } as unknown as PrismaService;
    const service = new KudosService(prisma, boardEvents);
    const controller = new KudosController(service);
    const received: BoardEvent[] = [];
    const subscription = controller.events().subscribe((event) => received.push(event));

    await service.createKudos('member-1', {
      recipientId: 'member-2',
      message: 'Great work!',
    });

    expect(received).toEqual([{
      type: 'kudos-added',
      data: { type: 'added', kudos: { id: 'kudos-live' } },
    }]);
    subscription.unsubscribe();
  });
});
