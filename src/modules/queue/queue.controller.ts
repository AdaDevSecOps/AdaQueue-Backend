import { Controller, Post, Body, Get, Param, Put, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { Query } from '@nestjs/common';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  async createQueue(@Body() dto: CreateQueueDto, @Req() req: any) {
    if ((dto.profileId !== undefined && typeof dto.profileId !== 'string') || typeof dto.industry !== 'string') throw new BadRequestException('Invalid queue identity');
    const profile = dto.profileId?.trim().toUpperCase(), industry = dto.industry.trim().toUpperCase();
    if (profile === 'PF-KSK-PICKUP' || industry === 'KSK_PICKUP') throw new ForbiddenException('Use the registered kiosk endpoint');
    if (profile === 'PF-QR-PICKUP' || industry === 'QR_PICKUP' || req.service) {
      if (!req.service || dto.profileId !== 'PF-QR-PICKUP' || dto.industry !== 'QR_PICKUP' || dto.refType !== 'QR_ORDER')
        throw new ForbiddenException();
    }
    return this.queueService.createQueue(dto);
  }

  @Get(':id')
  async getQueue(@Param('id') id: string) {
    return this.queueService.getQueue(id);
  }

  @Put(':id/state')
  async updateState(
    @Param('id') id: string,
    @Body() body: { targetState: string; industry: string },
    @Req() req: any
  ) {
    if (req.service) {
      const queue = await this.queueService.getQueue(id);
      const profile = queue.data?.profileId || queue.profileCode;
      const industry = profile === 'PF-KSK-PICKUP' ? 'KSK_PICKUP' : profile === 'PF-QR-PICKUP' ? 'QR_PICKUP' : null;
      if (!industry || body.industry !== industry || !['READY', 'COMPLETED'].includes(body.targetState)) throw new ForbiddenException();
    }
    // Current status is now fetched from DB inside service for better consistency
    return this.queueService.changeState(id, body.targetState, body.industry, req.user?.sourceRole || (req.service ? 'SERVICE' : undefined));
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
