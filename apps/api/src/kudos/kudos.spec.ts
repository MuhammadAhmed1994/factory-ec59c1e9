import { validate } from 'class-validator';
import { BoardEventsService, BoardEvent } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosDetails, KudosService } from './kudos.service';

const makeKudos = (id: string): KudosDetails => ({
  id,
  authorId: 'member-1',
  recipientId: 'member-2',
  message: 'Thank you!',
  isHidden: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  author: { id: 'member-1', name: 'Member One' },
  recipient: { id: 'member-2', name: 'Member Two' },
});

describe('KudosService', () => {
  it('[AC-3] creates member kudos and rejects messages over 280 characters', async () => {
    const created = makeKudos('kudos-1');
    const create = jest.fn().mockResolvedValue(created);
    const prisma = { kudos: { create } } as unknown as PrismaService;
    const events = new BoardEventsService();
    const service = new KudosService(prisma, events);
    const dto = Object.assign(new CreateKudosDto(), {
      recipientId: 'member-2',
      message: 'Thank you!',
    });

    await expect(service.createKudos('member-1', dto)).resolves.toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { authorId: 'member-1', recipientId: 'member-2', message: 'Thank you!' } }),
    );

    const invalid = Object.assign(new CreateKudosDto(), {
      recipientId: 'member-2',
      message: 'x'.repeat(281),
    });
    expect(await validate(invalid)).toHaveLength(1);
  });

  it('[AC-5] lists only visible kudos in deterministic 20-item pages', async () => {
    const firstPage = [makeKudos('kudos-20')];
    const findMany = jest.fn().mockResolvedValue(firstPage);
    const prisma = { kudos: { findMany } } as unknown as PrismaService;
    const service = new KudosService(prisma, new BoardEventsService());

    await expect(service.listKudos(2)).resolves.toEqual(firstPage);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isHidden: false },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
  });

  it('[AC-6] emits newly created kudos to connected event-stream subscribers', async () => {
    const events = new BoardEventsService();
    const created = makeKudos('kudos-live');
    const create = jest.fn().mockResolvedValue(created);
    const prisma = { kudos: { create } } as unknown as PrismaService;
    const service = new KudosService(prisma, events);
    const received: BoardEvent[] = [];
    const subscription = events.getEvents().subscribe((event) => received.push(event));

    const dto = Object.assign(new CreateKudosDto(), {
      recipientId: created.recipientId,
      message: created.message,
    });
    await service.createKudos(created.authorId, dto);
    subscription.unsubscribe();

    expect(received).toEqual([
      { type: 'kudos-added', data: { type: 'added', kudos: { id: 'kudos-live' } } },
    ]);
  });
});
