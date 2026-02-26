import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async fSaSUserFindByPin(pin: string): Promise<User | null> {
    try {
      // Find user first (Since pins are now potentially hashed, we can't find by PIN in the query directly)
      // This part is tricky if multiple users have the same PIN.
      // In a real system, you'd usually login with Username + PIN/Password.
      // But since we are PIN-only, we might need to find ALL and then filter or use a more specific identifier.
      // Given the AdaQueue context, we'll find all users and compare the pin.
      const users = await this.userRepository.find();
      for (const user of users) {
          const isMatch = await bcrypt.compare(pin, user.FTUsrPin).catch(() => false) || (pin === user.FTUsrPin); // Allow plain text for migration during dev
          if (isMatch) return user;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error finding user by pin: ${error.message}`);
      throw error;
    }
  }

  async fSaSUserUpdateLastLogin(userCode: string): Promise<void> {
    try {
      await this.userRepository.update(
        { FTUsrCode: userCode },
        { FDLastLogin: new Date() },
      );
    } catch (error) {
      this.logger.error(`Error updating last login for user ${userCode}: ${error.message}`);
      throw error;
    }
  }
}
