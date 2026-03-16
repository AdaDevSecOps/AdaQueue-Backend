import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByCode(code: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { code } });
  }

  async findByName(name: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { name } });
  }

  async updateLastLogin(code: string): Promise<void> {
    await this.userRepository.update(code, { lastLogin: new Date() });
  }
}
