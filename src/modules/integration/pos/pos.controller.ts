import { Controller, Post, Body, Logger } from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { EventService } from '../../events/events.service';
import { EventType } from '../../events/events.types';

@Controller('integration/pos')
export class PosController {
  private readonly logger = new Logger(PosController.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly eventService: EventService
  ) {}

  @Post('webhook/order-confirmed')
  async handleOrderConfirmed(@Body() payload: any) {
    this.logger.log(`[POS] Received Order Confirmed: ${JSON.stringify(payload)}`);

    // Payload expected: { orderId, tableNo, amount, items: [] }
    
    // 1. Publish Event (Decoupled)
    await this.eventService.publish(EventType.ORDER_CONFIRMED, payload, payload.orderId);

    // 2. Map Order to Queue (Simplified Logic)
    // In real app, we might query DB to find queue by TableNo or RefID
    // Here we assume we find the queue
    const queueDocNo = await this.findQueueByRef(payload.tableNo);
    
    if (queueDocNo) {
      // 3. Trigger State Change
      await this.queueService.changeState(queueDocNo, 'WAIT_FOOD', 'RESTAURANT');
    }

    return { status: 'received' };
  }

  private async findQueueByRef(refId: string): Promise<string | null> {
    // MOCK: Find queue by Table No or Order ID
    // return await this.queueRepo.findOne({ where: { refId } });
    return 'Q1737540000000'; // Mock DocNo
  }
}
