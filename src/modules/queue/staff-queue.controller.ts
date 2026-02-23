import { Controller, Post, Body } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('staff/queue')
export class StaffQueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('bulk')
  async bulk(@Body() body: { action: string; docNos: string[]; industry?: string }) {
    return this.queueService.bulkAction(body.action, body.docNos, body.industry || 'BANK');
  }

  @Post('finish')
  async finish(@Body() body: { docNo: string }) {
    return this.queueService.finishQueue(body.docNo);
  }
}
