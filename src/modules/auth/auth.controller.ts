import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginPinDto } from './dto/login-pin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async fSaCAuthLogin(
      @Body() loginPinDto: LoginPinDto,
      @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.fSaSAuthLogin(loginPinDto.pin);
    if (result.rtCode === '1' && result.roResult) {
        // Set Access Token in HttpOnly Cookie
        response.cookie('access_token', result.roResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600000, // 1 hour
        });
        
        // Return only user info and success code (Access Token is in cookie)
        return {
            rtCode: result.rtCode,
            rtDesc: result.rtDesc,
            roResult: {
                user: result.roResult.user,
                refreshToken: result.roResult.refreshToken // Refresh token might be returned to client for storage OR also cookie'd
            }
        };
    }
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async fSaCAuthRefresh(
      @Body('refreshToken') refreshToken: string,
      @Res({ passthrough: true }) response: Response
  ) {
      const result = await this.authService.fSaSAuthRefreshToken(refreshToken);
      if (result.rtCode === '1' && result.roResult) {
          response.cookie('access_token', result.roResult.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 3600000,
          });
      }
      return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async fSaCAuthLogout(@Res({ passthrough: true }) response: Response) {
      response.clearCookie('access_token');
      return { rtCode: '1', rtDesc: 'Logged out' };
  }
}
