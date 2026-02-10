import { Controller, Get, Query } from '@nestjs/common';

@Controller('analytics')
export class AnalyticsController {
  
  @Get('dashboard')
  getDashboardData(@Query('industry') industry: string) {
    // MOCK Data aggregation
    return {
      overview: {
        totalQueues: 150,
        activeQueues: 12,
        completedQueues: 138
      },
      performance: {
        avgWaitTime: '12m 30s',
        avgServiceTime: '5m 45s',
        slaBreaches: 3
      },
      trends: [
        { hour: '10:00', count: 20 },
        { hour: '11:00', count: 45 },
        { hour: '12:00', count: 80 } // Peak
      ]
    };
  }
}
