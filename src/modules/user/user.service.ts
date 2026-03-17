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

  async findAll(query?: { role?: string; status?: string }): Promise<User[]> {
    const where: any = {};
    if (query?.role) where.role = query.role;
    if (query?.status !== undefined) where.status = query.status;
    return this.userRepository.find({ where });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Note: PIN hashing should be handled here or in a subscriber
    // For now, assuming it's passed hashed or we hash it here if needed
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findByCode(code: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { code } });
  }

  async findByName(name: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { name, status: '0' } });
  }

  async update(code: string, updateData: Partial<User>): Promise<void> {
    await this.userRepository.update(code, updateData);
  }

  async updateLastLogin(code: string): Promise<void> {
    await this.userRepository.update(code, { lastLogin: new Date() });
  }

  async remove(code: string): Promise<void> {
    await this.userRepository.update(code, { status: '1' });
  }
}
