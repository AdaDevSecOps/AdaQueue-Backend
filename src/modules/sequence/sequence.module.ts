import { Module } from '@nestjs/common';
import { SequenceService } from './sequence.service';
import { SequenceController } from './sequence.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [SequenceController],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class SequenceModule {}
