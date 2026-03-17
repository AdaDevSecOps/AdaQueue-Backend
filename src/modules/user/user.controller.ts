import { Controller, Get, Post, Patch, Delete, Body, Param, Query, NotFoundException, ConflictException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('next-code')
  async getNextCode() {
    const code = await this.userService.getNextUserCode();
    return { code };
  }

  @Get()
  async findAll(@Query('role') role?: string, @Query('status') status?: string) {
    return this.userService.findAll({ role, status });
  }

  @Get(':code')
  async findOne(@Param('code') code: string) {
    const user = await this.userService.findByCode(code);
    if (!user) {
      throw new NotFoundException(`User with code ${code} not found`);
    }
    return user;
  }

  @Post()
  async create(@Body() userData: Partial<User>) {
    if (userData.code) {
      const existingUser = await this.userService.findByCode(userData.code);
      if (existingUser) {
        throw new ConflictException(`User Code ${userData.code} already exists`);
      }
    }
    
    if (userData.pin) {
      userData.pin = await bcrypt.hash(userData.pin, 10);
    }
    return this.userService.create(userData);
  }

  @Patch(':code')
  async update(@Param('code') code: string, @Body() updateData: Partial<User>) {
    const user = await this.userService.findByCode(code);
    if (!user) {
      throw new NotFoundException(`User with code ${code} not found`);
    }
    await this.userService.update(code, updateData);
    return { success: true };
  }

  @Post(':code/reset-pin')
  async resetPin(@Param('code') code: string, @Body('pin') newPin: string) {
    const user = await this.userService.findByCode(code);
    if (!user) {
      throw new NotFoundException(`User with code ${code} not found`);
    }
    const hashedPin = await bcrypt.hash(newPin, 10);
    await this.userService.update(code, { pin: hashedPin });
    return { success: true };
  }

  @Delete(':code')
  async remove(@Param('code') code: string) {
    const user = await this.userService.findByCode(code);
    if (!user) {
      throw new NotFoundException(`User with code ${code} not found`);
    }
    await this.userService.remove(code);
    return { success: true };
  }
}
