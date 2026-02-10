import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueController } from './queue.controller';
import { StaffConsoleController } from './staff-console.controller';
import { StaffQueueController } from './staff-queue.controller';
import { QueueService } from './queue.service';
import { QueueEntity } from './entities/queue.entity';
import { TypeOrmQueueRepository } from './repositories/queue.repository.typeorm';
import { WorkflowModule } from '../workflow/workflow.module';
import { SequenceModule } from '../sequence/sequence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueEntity]),
    WorkflowModule,
    SequenceModule
  ],
  controllers: [QueueController, StaffConsoleController, StaffQueueController],
  providers: [
    QueueService,
    {
      provide: 'IQueueRepository',
      useClass: TypeOrmQueueRepository,
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}
