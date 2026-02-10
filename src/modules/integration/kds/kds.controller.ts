import { Controller, Post, Body, Logger } from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { EventService } from '../../events/events.service';
import { EventType } from '../../events/events.types';

@Controller('integration/kds')
export class KdsController {
  private readonly logger = new Logger(KdsController.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly eventService: EventService
  ) {}

  @Post('webhook/status-update')
  async handleKdsUpdate(@Body() payload: any) {
    this.logger.log(`[KDS] Received Status Update: ${JSON.stringify(payload)}`);

    // Payload: { orderId, kdsStatus: 'COOKING' | 'READY' | 'SERVED' }

    await this.eventService.publish(EventType.KDS_STATUS_UPDATED, payload, payload.orderId);

    // Map KDS Status to Queue State (Config-driven)
    const statusMap = {
      'COOKING': null, // No state change
      'READY': 'WAIT_FOOD', // Redundant but safe
      'SERVED': 'EATING'
    };

    const targetState = statusMap[payload.kdsStatus];
    if (targetState) {
        // Find queue by Order ID
        const queueDocNo = 'Q1737540000000'; // Mock
        await this.queueService.changeState(queueDocNo, targetState, 'RESTAURANT');
    }

    return { status: 'processed' };
  }
}
