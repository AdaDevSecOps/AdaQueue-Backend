import { Controller, Get, Post, Body, Param, NotFoundException, Put, Delete } from '@nestjs/common';
import { WorkflowConfigService } from './workflow-config.service';
import { ProfileEntity } from './entities/profile.entity';

@Controller('profile')
export class ProfileController {
  constructor(private readonly workflowConfig: WorkflowConfigService) {}

  @Get()
  async getAllProfiles() {
    return await this.workflowConfig.getAllProfiles();
  }

  @Get(':code')
  async getProfile(@Param('code') code: string) {
    return await this.workflowConfig.getProfileByCode(code);
  }

  @Post()
  async createProfile(@Body() body: { code: string; name: string; config: any; agnCode?: string }) {
    if (!body.code || !body.name) {
        throw new Error('Missing required fields: code, name');
    }
    return await this.workflowConfig.saveProfile(body.code, body.name, body.config, body.agnCode);
  }

  @Put(':code')
  async updateProfile(@Param('code') code: string, @Body() body: { name: string; config: any; agnCode?: string }) {
    // Note: We don't require code in body as it's in the URL, but saveProfile expects it.
    return await this.workflowConfig.saveProfile(code, body.name, body.config, body.agnCode);
  }

  @Delete(':code')
  async deleteProfile(@Param('code') code: string) {
    return await this.workflowConfig.deleteProfile(code);
  }
}
