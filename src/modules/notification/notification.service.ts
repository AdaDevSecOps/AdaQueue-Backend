import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventType } from '../events/events.types';
import { NOTIFICATION_TEMPLATES } from './notification.config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  @OnEvent(EventType.QUEUE_STATE_CHANGED)
  handleQueueStateChange(payload: any) {
    const { docNo, newState, industry, data } = payload.data || payload;
    
    // 1. Find Matching Rule
    const config = NOTIFICATION_TEMPLATES[industry];
    if (!config || !config[newState]) return;

    const rule = config[newState];
    
    // 2. Format Message
    let message = rule.template;
    // Replace placeholders (Mock implementation)
    // In real app: use a template engine
    message = message.replace('{queueNo}', data?.queueNo || 'XX');
    message = message.replace('{customerName}', data?.customerName || 'Customer');

    // 3. Send Notification (Mock)
    this.send(rule.channel, data?.tel, message);
  }

  private send(channel: string, target: string, message: string) {
    this.logger.log(`[NOTIFICATION] Sending ${channel} to ${target}: "${message}"`);
    // Implement SMS / Line / Push Provider SDKs here
  }
}
