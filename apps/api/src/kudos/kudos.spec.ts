import { validate } from 'class-validator';
import { firstValueFrom } from 'rxjs';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosRecord, KudosService } from './kudos.service';

const makeKudos = (id: string): KudosRecord => ({
  id,
  authorId: 'member-1',
  recipientId: 'member-2',
  message: 'Thanks for your help!',
  isHidden: false,
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  updatedAt: new Date('2026-06-01T12:00:00.000Z'),
});

it('[AC-3] creates member kudos and validates the 280 character message limit', async () => {
  const record = makeKudos('kudos-1');
  const prisma = {
    user: {
      findUnique: jest.fn<Promise<{ id: string }>, []>().mockResolvedValue({ id: 'member-2' }),
    },
    kudos: {
      create: jest.fn<Promise<KudosRecord>, []>().mockResolvedValue(record),
    },
  } as unknown as PrismaService;
  const events = new BoardEventsService();
  const service = new KudosService(prisma, events);
  const dto = Object.assign(new CreateKudosDto(), {
    recipientId: 'member-2',
    message: 'x'.repeat(280),
  });
  const tooLong = Object.assign(new CreateKudosDto(), {
    recipientId: 'member-2',
    message: 'x'.repeat(281),
  });

  const created = await service.create('member-1', dto);
  expect(created).toEqual(record);
  expect(prisma.kudos.create).toHaveBeenCalledWith({
    data: { authorId: 'member-1', recipientId: 'member-2', message: 'x'.repeat(280) },
  });
  expect(await validate(dto)).toHaveLength(0);
  expect((await validate(tooLong)).some((error) => error.property === 'message')).toBe(true);
});

it('[AC-5] lists only visible kudos with stable newest-first page ordering', async () => {
  const rows = [makeKudos('kudos-z'), makeKudos('kudos-a')];
  const prisma = {
    kudos: {
      findMany: jest.fn<Promise<KudosRecord[]>, []>().mockResolvedValue(rows),
    },
  } as unknown as PrismaService;
  const service = new KudosService(prisma, new BoardEventsService());

  expect(await service.listVisible(2)).toEqual(rows);
  expect(prisma.kudos.findMany).toHaveBeenCalledWith({
    where: { isHidden: false },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: 20,
    take: 20,
  });
});

it('[AC-6] publishes newly created kudos to connected event-stream subscribers', async () => {
  const record = makeKudos('kudos-live');
  const prisma = {
    user: {
      findUnique: jest.fn<Promise<{ id: string }>, []>().mockResolvedValue({ id: 'member-2' }),
    },
    kudos: {
      create: jest.fn<Promise<KudosRecord>, []>().mockResolvedValue(record),
    },
  } as unknown as PrismaService;
  const events = new BoardEventsService();
  const service = new KudosService(prisma, events);
  const receivedEvent = firstValueFrom(events.getEvents());

  await service.create('member-1', { recipientId: 'member-2', message: 'Great work!' });

  expect(await receivedEvent).toMatchObject({
    type: 'kudos-added',
    data: { type: 'added', kudos: { id: 'kudos-live' } },
  });
});
