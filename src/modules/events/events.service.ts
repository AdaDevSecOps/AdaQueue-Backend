import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType, IEventPayload } from './events.types';
// Note: Use dynamic import for amqplib to avoid hard dependency if not installed

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private readonly processedEvents = new Set<string>(); // Mock Idempotency Store
  private amqpUrl = process.env.RABBITMQ_URL || '';
  private exchangeName = process.env.AQ_EVENTS_EXCHANGE || 'aq.events';
  private exchangeType: 'topic' | 'direct' | 'fanout' | 'headers' | 'match' = 'topic';
  private amqpConn: any = null;
  private amqpChannel: any = null;
  private amqpInitPromise: Promise<void> | null = null;

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Publish Event (Idempotent & Retry Logic Abstraction)
   */
  async publish(type: EventType, data: any, correlationId?: string) {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payload: IEventPayload = {
      eventId,
      timestamp: new Date(),
      eventType: type,
      correlationId,
      data,
      meta: { source: 'AQMS_BACKEND', retryCount: 0 }
    };

    this.logger.log(`[PUBLISH] ${type} | ID: ${eventId} | Ref: ${correlationId}`);
    
    // 1) Internal in-process emitter (backward compatible)
    this.eventEmitter.emit(type, payload);

    // 2) RabbitMQ (if configured)
    try {
      if (this.amqpUrl) {
        await this.ensureAmqp();
        if (this.amqpChannel) {
          const routingKey = this.routingKeyFor(type);
          const ok = this.amqpChannel.publish(
            this.exchangeName,
            routingKey,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true, contentType: 'application/json', messageId: eventId, timestamp: Date.now() }
          );
          if (!ok) {
            this.logger.warn(`[RMQ] publish returned false (buffering) rk=${routingKey}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`[RMQ] Failed to publish event ${eventId}: ${err?.message || err}`);
    }
  }

  /**
   * Publish locally only (no RabbitMQ) - for flows that must bypass RMQ
   */
  async publishLocal(type: EventType, data: any, correlationId?: string) {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const payload: IEventPayload = {
      eventId,
      timestamp: new Date(),
      eventType: type,
      correlationId,
      data,
      meta: { source: 'AQMS_BACKEND', localOnly: true }
    };
    this.logger.log(`[LOCAL] ${type} | ID: ${eventId} | Ref: ${correlationId}`);
    this.eventEmitter.emit(type, payload);
  }
  /**
   * Subscribe & Handle with Idempotency Check
   */
  async handleEvent(payload: IEventPayload, handler: (data: any) => Promise<void>) {
    // 1. Idempotency Check
    if (this.processedEvents.has(payload.eventId)) {
      this.logger.warn(`[SKIP] Event ${payload.eventId} already processed.`);
      return;
    }

    try {
      // 2. Process
      await handler(payload.data);
      
      // 3. Mark as Processed
      this.processedEvents.add(payload.eventId);
      this.logger.log(`[SUCCESS] Event ${payload.eventId} processed.`);

    } catch (error) {
      // 4. DLQ / Retry Logic
      this.logger.error(`[ERROR] Processing ${payload.eventId}: ${error.message}`);
      // In real world: Send to DLQ or re-queue with delay
    }
  }

  private routingKeyFor(type: EventType): string {
    switch (type) {
      case EventType.QUEUE_CREATED:
        return 'queue.created';
      case EventType.QUEUE_STATE_CHANGED:
        return 'queue.state.changed';
      case EventType.ORDER_CONFIRMED:
        return 'order.confirmed';
      case EventType.KDS_STATUS_UPDATED:
        return 'kds.status.updated';
      case EventType.NOTIFICATION_SENT:
        return 'notification.sent';
      default:
        return 'event.unknown';
    }
  }

  private async ensureAmqp(): Promise<void> {
    if (this.amqpChannel && this.amqpConn) return;
    if (this.amqpInitPromise) {
      await this.amqpInitPromise;
      return;
    }
    this.amqpInitPromise = (async () => {
      try {
        // dynamic import
        const amqp = await import('amqplib');
        this.amqpConn = await amqp.connect(this.amqpUrl);
        const ch: any = await this.amqpConn.createConfirmChannel();
        await ch.assertExchange(this.exchangeName, this.exchangeType, { durable: true } as any);
        this.amqpChannel = ch;
        this.logger.log(`[RMQ] Connected to ${this.amqpUrl}, exchange=${this.exchangeName}`);
        this.amqpConn.on('close', () => {
          this.logger.warn('[RMQ] Connection closed');
          this.amqpConn = null;
          this.amqpChannel = null;
          this.amqpInitPromise = null;
        });
        this.amqpConn.on('error', (err) => {
          this.logger.error(`[RMQ] Connection error: ${err?.message || err}`);
        });
      } catch (err: any) {
        this.logger.error(`[RMQ] Connection failed: ${err?.message || err}`);
        this.amqpConn = null;
        this.amqpChannel = null;
        this.amqpInitPromise = null;
      }
    })();
    await this.amqpInitPromise;
  }
}
