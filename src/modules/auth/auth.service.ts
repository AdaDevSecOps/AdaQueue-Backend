import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async fSaSAuthLogin(pin: string) {
    try {
      // 1. Find user by pin
      const user = await this.userService.fSaSUserFindByPin(pin);

      if (!user) {
        throw new UnauthorizedException('Invalid PIN');
      }

      // 2. Update Last Login
      await this.userService.fSaSUserUpdateLastLogin(user.FTUsrCode);

      // 3. Generate Tokens
      const payload = {
        sub: user.FTUsrCode,
        username: user.FTUsrCode,
        name: user.FTUsrName,
        role: user.FTUsrRole,
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // 4. Return standard response
      return {
        rtCode: '1',
        rtDesc: 'Success',
        roResult: {
          accessToken,
          refreshToken,
          user: {
            username: user.FTUsrCode,
            name: user.FTUsrName,
            role: user.FTUsrRole,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return {
        rtCode: '0',
        rtDesc: error.message || 'Error occurred during login',
        roResult: null,
      };
    }
  }

  async fSaSAuthRefreshToken(token: string) {
      try {
          const payload = this.jwtService.verify(token);
          const newPayload = {
              sub: payload.sub,
              username: payload.username,
              name: payload.name,
              role: payload.role,
          };
          const accessToken = this.jwtService.sign(newPayload, { expiresIn: '1h' });
          return {
              rtCode: '1',
              rtDesc: 'Token Refreshed',
              roResult: { accessToken }
          };
      } catch (e) {
          throw new UnauthorizedException('Invalid refresh token');
      }
  }
}
