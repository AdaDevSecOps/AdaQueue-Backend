import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Profile[]> {
    return this.profileRepository.find();
  }

  async findAssignedProfileCodes(userCode: string): Promise<string[]> {
    const userProfiles = await this.userProfileRepository.find({
      where: { userCode },
    });
    return userProfiles.map(up => up.profileCode);
  }

  async assignProfiles(userCode: string, newProfileCodes: string[]): Promise<void> {
    const user = await this.userRepository.findOne({ where: { code: userCode } });
    if (!user) {
      throw new NotFoundException(`User with code ${userCode} not found`);
    }

    const currentAssigned = await this.userProfileRepository.find({
      where: { userCode },
    });
    
    const currentCodes = currentAssigned.map(up => up.profileCode);
    
    const toDelete = currentAssigned.filter(up => !newProfileCodes.includes(up.profileCode));
    const toAddCodes = newProfileCodes.filter(code => !currentCodes.includes(code));
    
    if (toDelete.length > 0) {
      await this.userProfileRepository.remove(toDelete);
    }
    
    if (toAddCodes.length > 0) {
      // Find the last code in the table
      const lastUserProfiles = await this.userProfileRepository.find({
        order: { code: 'DESC' },
        take: 1,
      });
      const lastUserProfile = lastUserProfiles.length > 0 ? lastUserProfiles[0] : null;
      
      let currentCodeNum = 0;
      if (lastUserProfile && lastUserProfile.code && !isNaN(parseInt(lastUserProfile.code, 10))) {
        currentCodeNum = parseInt(lastUserProfile.code, 10);
      }

      const newAssignments = toAddCodes.map((code) => {
        currentCodeNum++;
        const up = new UserProfile();
        up.code = currentCodeNum.toString().padStart(6, '0');
        up.userCode = userCode;
        up.profileCode = code;
        up.createOn = new Date();
        return up;
      });
      await this.userProfileRepository.save(newAssignments);
    }
  }
}
