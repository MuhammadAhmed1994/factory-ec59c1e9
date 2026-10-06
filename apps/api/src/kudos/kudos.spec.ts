import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosPageQueryDto } from './kudos.controller';
import { KudosDetails, KudosService } from './kudos.service';

const kudosFixture: KudosDetails = {
  id: 'kudos-1',
  authorId: 'author-1',
  recipientId: 'recipient-1',
  message: 'Thank you for your help!',
  isHidden: false,
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  author: { id: 'author-1', name: 'Alex' },
  recipient: { id: 'recipient-1', name: 'Sam' },
};

function makeService() {
  const create = jest.fn<Promise<KudosDetails>, []>();
  const findMany = jest.fn<Promise<KudosDetails[]>, []>();
  const prisma = {
    kudos: { create, findMany },
  } as unknown as PrismaService;
  const events = new BoardEventsService();
  return { service: new KudosService(prisma, events), prisma, create, findMany };
}

describe('Kudos endpoints', () => {
  it('[AC-3] creates member kudos and rejects messages over 280 characters', async () => {
    const { service, prisma, create } = makeService();
    create.mockResolvedValue(kudosFixture);

    const input = Object.assign(new CreateKudosDto(), {
      recipientId: 'recipient-1',
      message: 'Thank you for your help!',
    });
    const result = await service.createKudos('author-1', input);
    const tooLong = Object.assign(new CreateKudosDto(), {
      recipientId: 'recipient-1',
      message: 'x'.repeat(281),
    });

    expect(result).toEqual(kudosFixture);
    expect(prisma.kudos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { authorId: 'author-1', recipientId: 'recipient-1', message: input.message },
      }),
    );
    expect((await validate(tooLong)).some((error) => error.property === 'message')).toBe(true);
  });

  it('[AC-5] returns visible kudos with stable pagination ordering and validates page values', async () => {
    const { service, prisma, findMany } = makeService();
    findMany.mockResolvedValue([kudosFixture]);
    const pageQuery = plainToInstance(KudosPageQueryDto, { page: '2' });
    const invalidPage = plainToInstance(KudosPageQueryDto, { page: '0' });

    expect(await service.getKudos(pageQuery.page)).toEqual([kudosFixture]);
    expect(prisma.kudos.findMany).toHaveBeenCalledWith({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 20,
      include: {
        author: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    });
    expect((await validate(invalidPage)).some((error) => error.property === 'page')).toBe(true);
    expect(new KudosPageQueryDto().page).toBe(1);
  });

  it('[AC-6] emits newly created kudos to connected event-stream subscribers', async () => {
    const { service, create } = makeService();
    create.mockResolvedValue(kudosFixture);
    const received: unknown[] = [];
    const subscription = service.getBoardEvents().subscribe((event) => received.push(event));

    await service.createKudos('author-1', {
      recipientId: 'recipient-1',
      message: 'Thank you for your help!',
    });

    expect(received).toEqual([
      { type: 'kudos-added', data: { type: 'added', kudos: { id: 'kudos-1' } } },
    ]);
    subscription.unsubscribe();
  });
});
