import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { Query } from '@nestjs/common';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  async createQueue(@Body() dto: CreateQueueDto) {
    return this.queueService.createQueue(dto);
  }

  @Get(':id')
  async getQueue(@Param('id') id: string) {
    return this.queueService.getQueue(id);
  }

  @Put(':id/state')
  async updateState(
    @Param('id') id: string,
    @Body() body: { targetState: string; industry: string }
  ) {
    // Current status is now fetched from DB inside service for better consistency
    return this.queueService.changeState(id, body.targetState, body.industry);
  }

  @Get(':industry/:status/next-actions')
  async getNextActions(
    @Param('industry') industry: string,
    @Param('status') status: string
  ) {
    return this.queueService.getNextActions(industry, status);
  }

  @Get('profile/:profileId')
  async getQueuesByProfile(@Param('profileId') profileId: string) {
    try {
      console.log(`[QueueController] Fetching queues for profile: ${profileId}`);
      return await this.queueService.getQueuesByProfile(profileId);
    } catch (error) {
      console.error(`[QueueController] Error fetching queues for profile ${profileId}:`, error);
      throw error;
    }
  }

  @Get('next-number')
  async getNextNumber(
    @Query('profileId') profileId?: string,
    @Query('serviceGroup') serviceGroup?: string,
    @Query('queueType') queueType?: string
  ) {
    const type = queueType || serviceGroup;
    const n = await this.queueService.getNextNumber(profileId, type);
    return { next: n };
  }
}
