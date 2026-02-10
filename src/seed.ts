import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QueueService } from './modules/queue/queue.service';
import { CreateQueueDto } from './modules/queue/dto/create-queue.dto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const queueService = app.get(QueueService);

  console.log('🌱 Seeding Test Data...');

  const testQueues: CreateQueueDto[] = [
    {
      customerName: 'คุณสมชาย ใจดี',
      tel: '081-111-1111',
      industry: 'RESTAURANT',
      refId: 'ORD-001',
      refType: 'ORDER',
      attributes: { pax: 4, zone: 'Indoor' }
    },
    {
      customerName: 'คุณมานี มีตา',
      tel: '082-222-2222',
      industry: 'RESTAURANT',
      refId: 'ORD-002',
      refType: 'ORDER',
      attributes: { pax: 2, zone: 'Outdoor' }
    },
    {
      customerName: 'คุณปิติ ยินดี',
      tel: '083-333-3333',
      industry: 'RESTAURANT',
      refId: 'ORD-003',
      refType: 'ORDER',
      attributes: { pax: 1, zone: 'Bar' }
    }
  ];

  for (const dto of testQueues) {
    try {
      const queue = await queueService.createQueue(dto);
      console.log(`✅ Created Queue: ${queue.docNo} - ${queue.customerName} (${queue.status})`);
    } catch (error) {
      console.error(`❌ Failed to create queue for ${dto.customerName}:`, error.message);
    }
  }

  console.log('✨ Seeding Completed');
  await app.close();
}

bootstrap();
