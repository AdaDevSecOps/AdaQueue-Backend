import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
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
    // By default, filter out deleted users (status 3)
    if (query?.status !== undefined) {
      where.status = query.status;
    } else {
      where.status = Not('3');
    }
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
    // Look for users who are either Active (1) or Inactive (2)
    // Deleted users (3) are treated as non-existent for login validation
    return this.userRepository.findOne({ 
      where: [
        { name, status: '1' },
        { name, status: '2' }
      ] 
    });
  }

  async update(code: string, updateData: Partial<User>): Promise<void> {
    await this.userRepository.update(code, updateData);
  }

  async updateLastLogin(code: string): Promise<void> {
    await this.userRepository.update(code, { lastLogin: new Date() });
  }

  async remove(code: string): Promise<void> {
    await this.userRepository.update(code, { status: '3' });
  }

  async getNextUserCode(): Promise<string> {
    const users = await this.userRepository.find({ select: ['code'] });
    const codes = users
      .map(u => parseInt(u.code, 10))
      .filter(num => !isNaN(num));
    
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    const nextCode = maxCode + 1;
    return nextCode.toString().padStart(3, '0');
  }
}
