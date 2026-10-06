import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BoardEventsService } from '../common/events/board-events.service';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('ModerationController', () => {
  let app: INestApplication;
  const prisma = {
    kudos: {
      findUnique: jest.fn<Promise<{ id: string } | null>, []>(),
      update: jest.fn<Promise<{ id: string; isHidden: boolean }>, []>(),
    },
  };
  const boardEvents = {
    publishKudosRemoved: jest.fn<void, [id: string]>(),
  };

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it('[AC-8] a team lead can hide kudos through the API', async () => {
    prisma.kudos.findUnique.mockResolvedValue({ id: 'kudos-123' });
    prisma.kudos.update.mockResolvedValue({ id: 'kudos-123', isHidden: true });

    const moduleRef = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BoardEventsService, useValue: boardEvents },
      ],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
          context.switchToHttp().getRequest().user = {
            id: 'lead-1',
            email: 'lead@example.com',
            name: 'Team Lead',
            role: 'TEAM_LEAD',
          };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/kudos/kudos-123/hide')
      .expect(201)
      .expect({ id: 'kudos-123', isHidden: true });

    expect(prisma.kudos.update).toHaveBeenCalledWith({
      where: { id: 'kudos-123' },
      data: { isHidden: true },
      select: { id: true, isHidden: true },
    });
    expect(boardEvents.publishKudosRemoved).toHaveBeenCalledWith('kudos-123');
  });
});
