import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDesignerController } from './workflow-designer.controller';
import { ProfileController } from './profile.controller';
import { WorkflowEngine } from './workflow.engine';
import { WorkflowConfigService } from './workflow-config.service';
import { WorkflowEntity } from './entities/workflow.entity';
import { ProfileEntity } from './entities/profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, ProfileEntity])
  ],
  controllers: [WorkflowDesignerController, ProfileController],
  providers: [WorkflowEngine, WorkflowConfigService],
  exports: [WorkflowEngine, WorkflowConfigService],
})
export class WorkflowModule {}
