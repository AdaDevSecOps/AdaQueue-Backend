import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async findAll() {
    return this.profileService.findAll();
  }
}

@Controller('users/:code/profiles')
export class UserProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getAssignedProfiles(@Param('code') code: string) {
    const profileCodes = await this.profileService.findAssignedProfileCodes(code);
    return { profileCodes };
  }

  @Post()
  async assignProfiles(@Param('code') code: string, @Body('profileCodes') profileCodes: string[]) {
    await this.profileService.assignProfiles(code, profileCodes || []);
    return { success: true };
  }
}
