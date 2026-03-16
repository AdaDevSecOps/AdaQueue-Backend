import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(identifier: string, pin: string): Promise<any> {
    const user = await this.userService.findByName(identifier);
    if (user) {
      // For development, we support both plain text (for initial migration) and hashed PINs
      // In production, we should only support hashed PINs
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(pin, user.pin);
      } catch (e) {
        // If bcrypt fails, it might be a plain text PIN (during transition)
        isMatch = user.pin === pin;
      }

      if (isMatch) {
        const { pin: _, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.code, sub: user.code, role: user.role };
    await this.userService.updateLastLogin(user.code);
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        username: user.code,
        name: user.name,
        role: user.role,
      },
    };
  }
}
