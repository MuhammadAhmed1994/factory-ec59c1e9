import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface BoardKudosEventPayload {
  id: string;
}

export interface BoardKudosAddedEvent extends MessageEvent {
  type: 'kudos-added';
  data: { type: 'added'; kudos: BoardKudosEventPayload };
}

export interface BoardKudosRemovedEvent extends MessageEvent {
  type: 'kudos-removed';
  data: { type: 'removed'; id: string };
}

export type BoardEvent = BoardKudosAddedEvent | BoardKudosRemovedEvent;

@Injectable()
export class BoardEventsService {
  private readonly events = new Subject<BoardEvent>();

  getEvents(): Observable<BoardEvent> {
    return this.events.asObservable();
  }

  publishKudosAdded(kudos: BoardKudosEventPayload): void {
    this.events.next({
      type: 'kudos-added',
      data: { type: 'added', kudos },
    });
  }

  publishKudosRemoved(kudosId: string): void {
    this.events.next({
      type: 'kudos-removed',
      data: { type: 'removed', id: kudosId },
    });
  }
}
