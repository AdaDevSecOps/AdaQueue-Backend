import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventType } from './events.types';

@Injectable()
export class EventsRmqListener implements OnModuleInit {
  private readonly logger = new Logger(EventsRmqListener.name);
  private amqpUrl = process.env.RABBITMQ_URL || '';
  private exchangeName = process.env.AQ_EVENTS_EXCHANGE || 'aq.events';
  private bindingKey = process.env.AQ_STAFFOPS_BINDING || 'queue.*';
  private queueName = '';
  private conn: any = null;
  private ch: any = null;

  constructor(private readonly gateway: EventsGateway) {}

  async onModuleInit() {
    if (!this.amqpUrl) {
      this.logger.log('RABBITMQ_URL not set, RMQ listener disabled');
      return;
    }
    try {
      const inst = 'staff-ops-primary';
      this.queueName = `aq.staff-ops.${inst}`;

      const amqp = await import('amqplib');
      this.conn = await amqp.connect(this.amqpUrl);
      this.ch = await this.conn.createChannel();
      await this.ch.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.ch.assertQueue(this.queueName, { durable: true });
      await this.ch.bindQueue(this.queueName, this.exchangeName, this.bindingKey);

      this.logger.log(`RMQ listener connected. queue=${this.queueName} bind=${this.bindingKey}`);

      await this.ch.consume(this.queueName, (msg: any) => {
        if (!msg) return;
        try {
          const content = msg.content ? msg.content.toString('utf8') : '{}';
          const payload = JSON.parse(content);
          this.handlePayload(payload, msg.fields?.routingKey || '');
          this.ch.ack(msg);
        } catch (err: any) {
          this.logger.error(`Consume error: ${err?.message || err}`);
          try { this.ch.nack(msg, false, false); } catch {}
        }
      }, { noAck: false });

      this.conn.on('close', () => this.logger.warn('RMQ connection closed'));
      this.conn.on('error', (err: any) => this.logger.error(`RMQ error: ${err?.message || err}`));
    } catch (err: any) {
      this.logger.error(`Failed to initialize RMQ listener: ${err?.message || err}`);
    }
  }

  private handlePayload(payload: any, rk: string) {
    const type: string = payload?.eventType || rk || '';
    const data = payload?.data || payload;

    switch (type) {
      case EventType.QUEUE_CREATED:
      case 'queue.created':
        this.gateway.server?.emit('queue:update', { type: 'created', queue: data });
        this.logger.log(`Emit from RMQ: queue.created ${data?.docNo || ''}`);
        break;
      case EventType.QUEUE_STATE_CHANGED:
      case 'queue.state.changed':
        this.gateway.server?.emit('queue:update', { type: 'state_changed', queue: data, newState: payload?.newState });
        this.logger.log(`Emit from RMQ: queue.state.changed ${data?.docNo || ''}`);
        break;
      default:
        this.logger.debug(`Unhandled event type/rk=${type}`);
    }
  }
}
