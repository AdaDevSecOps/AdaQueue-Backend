import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EventType } from './events.types';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/ws'
})
@Injectable()
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  @OnEvent(EventType.QUEUE_CREATED)
  handleQueueCreated(payload: any) {
    const data = payload?.data || payload;
    this.server.emit('queue:update', { type: 'created', queue: data });
    this.logger.log(`Emitted queue.created for ${data?.docNo || ''}`);
  }

  @OnEvent(EventType.QUEUE_STATE_CHANGED)
  handleQueueStateChanged(payload: any) {
    const data = payload?.data || payload;
    this.server.emit('queue:update', { type: 'state_changed', queue: data, newState: payload?.newState });
    this.logger.log(`Emitted queue.state.changed for ${data?.docNo || ''}`);
  }
}
