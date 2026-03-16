import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileService } from './profile.service';
import { ProfileController, UserProfileController } from './profile.controller';
import { Profile } from './entities/profile.entity';
import { UserProfile } from './entities/user-profile.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, UserProfile, User]),
  ],
  controllers: [ProfileController, UserProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
