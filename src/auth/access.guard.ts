import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const controller = context.getClass().name, handler = context.getHandler().name;
    if (controller === 'AuthController' && handler === 'login') return true;
    // This endpoint independently validates its device key and accepted bill in SQL.
    if (controller === 'KioskTrialController' && handler === 'requestQueue') return true;
    if (req.method === 'GET' && !['AuthController', 'StaffConsoleController', 'AnalyticsController', 'PerformanceController', 'SequenceController'].includes(controller)) return true;
    const authorization = req.headers.authorization;
    if (controller === 'QueueController' && ['createQueue', 'updateState'].includes(handler) && this.auth.isService(authorization)) {
      req.service = true;
      return true;
    }
    const profile = typeof req.body?.profileId === 'string' ? req.body.profileId.trim().toUpperCase() : null;
    const industry = typeof req.body?.industry === 'string' ? req.body.industry.trim().toUpperCase() : null;
    // Preserve generic public ticket issuance; pickup profiles belong to the integrations.
    if (controller === 'QueueController' && handler === 'createQueue'
      && !['PF-KSK-PICKUP', 'PF-QR-PICKUP'].includes(profile)
      && !['KSK_PICKUP', 'QR_PICKUP'].includes(industry) && !authorization) return true;
    const session = await this.auth.authenticate(authorization);
    req.user = session.user;
    req.authExpires = session.exp;
    if (req.method !== 'GET' && !['QueueController', 'StaffConsoleController', 'StaffQueueController', 'PerformanceController'].includes(controller)
      && req.user.role !== 'ADMIN') throw new ForbiddenException();
    return true;
  }
}
