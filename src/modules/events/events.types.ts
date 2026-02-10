export enum EventType {
  QUEUE_CREATED = 'queue.created',
  QUEUE_STATE_CHANGED = 'queue.state.changed',
  ORDER_CONFIRMED = 'order.confirmed',
  KDS_STATUS_UPDATED = 'kds.status.updated',
  NOTIFICATION_SENT = 'notification.sent',
}

export interface IEventPayload {
  eventId: string;
  timestamp: Date;
  eventType: EventType;
  correlationId?: string; // For tracing (e.g. DocNo)
  data: any;
  meta?: {
    source: string;
    retryCount?: number;
  };
}

export interface IEventHandler {
  handle(event: IEventPayload): Promise<void>;
}
