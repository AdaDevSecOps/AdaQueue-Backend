import { Body, Controller, Get, HttpException, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private attempts = new Map<string, { until: number; count: number }>();
  constructor(private auth: AuthService) {}

  @Post('login-pin')
  async login(@Body() body: { pin: string }, @Req() req: any) {
    const now = Date.now();
    for (const [key, value] of this.attempts) if (value.until <= now) this.attempts.delete(key);
    const address = req.socket.remoteAddress || 'unknown';
    for (const [key, limit] of [['*', 40], [address, 10]] as const) {
      const value = this.attempts.get(key) || { until: now + 60_000, count: 0 };
      value.count++;
      this.attempts.set(key, value);
      if (value.count > limit) throw new HttpException('Too many PIN attempts', 429);
    }
    return this.auth.login(body?.pin);
  }

  @Get('session')
  session(@Req() req: any) { return { success: true, user: req.user, exp: req.authExpires }; }
}
