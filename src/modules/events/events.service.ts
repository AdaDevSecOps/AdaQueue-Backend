import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType, IEventPayload } from './events.types';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private readonly processedEvents = new Set<string>(); // Mock Idempotency Store

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
    
    // In Real World: Send to RabbitMQ / Kafka / Azure Service Bus
    // Here: Use NestJS Internal Event Emitter for demo
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
}
