import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly svc: PerformanceService) {}

  @Get('summary')
  async summary(@Query() q: any) {
    const data = await this.svc.getSummary(q);
    return { success: true, data, meta: { filters: q, refreshedAt: new Date().toISOString() } };
  }

  @Get('heatmap')
  async heatmap(@Query() q: any) {
    const data = await this.svc.getHeatmap(q);
    return { success: true, data, meta: { filters: q } };
  }

  @Get('staff')
  async staff(@Query() q: any) {
    const res = await this.svc.getStaffMetrics(q);
    return { success: true, data: res.data, meta: { ...res.meta, filters: q } };
  }

  @Post('export')
  async export(@Body() body: any) {
    const res = await this.svc.exportCsv(body || {});
    return { success: true, data: res };
  }
}
