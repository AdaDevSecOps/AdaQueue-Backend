import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowEntity } from './entities/workflow.entity';
import { ProfileEntity } from './entities/profile.entity';
import { IWorkflowDefinition } from './workflow.types';
import { DEFAULT_WORKFLOWS } from './workflow.defaults';
import { DEFAULT_PROFILES } from './profile.defaults';

@Injectable()
export class WorkflowConfigService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowConfigService.name);

  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepo: Repository<WorkflowEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
  ) { }

  async onModuleInit() {
    await this.seedDefaultWorkflows();
    await this.seedDefaultProfiles();
  }

  private async seedDefaultProfiles() {
    try {
      const count = await this.profileRepo.count();
      if (count > 0) {
        this.logger.log('Profiles already exist in TQUMProfile. Skipping seed.');
        return;
      }

      this.logger.log('Seeding default profiles to TQUMProfile...');
      for (const profile of DEFAULT_PROFILES) {
        await this.saveProfile(profile.code, profile.name, profile.config);
        this.logger.log(`Seeded profile: ${profile.code}`);
      }
    } catch (error) {
      this.logger.error('Failed to seed profiles', error);
    }
  }

  private async seedDefaultWorkflows() {
    try {
      const count = await this.workflowRepo.count();
      if (count > 0) {
        this.logger.log('Workflows already exist in TQUMQueueConfig. Skipping seed.');
        return;
      }

      this.logger.log('Seeding default workflows to TQUMQueueConfig...');
      // Load examples
      const examples = DEFAULT_WORKFLOWS;

      for (const key in examples) {
        const def = examples[key];
        await this.saveWorkflow(def);
        this.logger.log(`Seeded workflow: ${def.flowCode}`);
      }
      this.logger.log('Seeding complete.');
    } catch (error) {
      this.logger.error('Failed to seed workflows', error);
    }
  }

  async getWorkflowByIndustry(industry: string): Promise<IWorkflowDefinition> {
    // 1. Find Config/Profile by Industry (Assuming Industry Code maps to Profile for now, or direct Workflow mapping)
    // For simplicity, let's look for a Workflow with this industry directly.
    const workflow = await this.workflowRepo.findOne({ where: { industry } });

    if (!workflow) {
      throw new NotFoundException(`Workflow for industry ${industry} not found`);
    }

    return workflow.toDefinition();
  }

  async getWorkflowByCode(code: string): Promise<IWorkflowDefinition> {
    const workflow = await this.workflowRepo.findOne({ where: { flowCode: code } });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${code} not found`);
    }
    return workflow.toDefinition();
  }

  async saveWorkflow(definition: IWorkflowDefinition): Promise<WorkflowEntity> {
    let entity = await this.workflowRepo.findOne({ where: { flowCode: definition.flowCode } });
    if (!entity) {
      entity = new WorkflowEntity();
      entity.flowCode = definition.flowCode;
    }

    entity.industry = definition.industry;
    entity.flowName = definition.industry + ' Standard Workflow';

    // Store full definition in configJson
    entity.configJson = JSON.stringify(definition);

    return await this.workflowRepo.save(entity);
  }

  async saveProfile(code: string, name: string, config: any, agnCode?: string, businessType?: string): Promise<ProfileEntity> {
    let entity = await this.profileRepo.findOne({ where: { code } });

    if (!entity) {
      entity = new ProfileEntity();
      entity.code = code;
    }

    entity.name = name;

    if (agnCode !== undefined) {
      entity.agnCode = agnCode;
    }

    if (businessType !== undefined) {
      entity.businessType = businessType;
    }

    if (config !== undefined) {
      entity.config = config;
    }

    this.logger.log(`Saving profile: ${code} (${name})`);
    return await this.profileRepo.save(entity);
  }

  async deleteProfile(code: string): Promise<void> {
    const result = await this.profileRepo.delete(code);
    if (result.affected === 0) {
      throw new NotFoundException(`Profile ${code} not found`);
    }
    this.logger.log(`Deleted profile: ${code}`);
  }

  async getAllProfiles(): Promise<ProfileEntity[]> {
    return await this.profileRepo.find();
  }

  async getProfileByCode(code: string): Promise<ProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { code } });
    if (!profile) {
      throw new NotFoundException(`Profile ${code} not found`);
    }
    return profile;
  }

  async getProfileByAgnCode(agnCode: string): Promise<ProfileEntity | null> {
    if (!agnCode) return null;
    return await this.profileRepo.findOne({ where: { agnCode } });
  }
}
