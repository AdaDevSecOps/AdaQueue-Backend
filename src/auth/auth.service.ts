import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

export type QueueUser = { username: string; name: string; role: 'ADMIN' | 'STAFF'; sourceRole: string };

@Injectable()
export class AuthService {
  private async request(path: string, token?: string, pin?: string) {
    const base = process.env.KDS_AUTH_URL;
    if (!base) throw new ServiceUnavailableException('KDS authentication is not configured');
    let url: URL;
    try { url = new URL(base); } catch { throw new ServiceUnavailableException('Invalid KDS authentication URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new ServiceUnavailableException('Invalid KDS authentication URL');
    let response: Response;
    try {
      response = await fetch(base.replace(/\/+$/, '') + path, {
        method: pin === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: pin === undefined ? undefined : JSON.stringify({ pin }),
      });
    } catch { throw new ServiceUnavailableException('KDS authentication is unavailable'); }
    if (response.status === 401 || response.status === 403) throw new UnauthorizedException('Invalid session or PIN');
    if (!response.ok) throw new ServiceUnavailableException('KDS authentication is unavailable');
    let value: any;
    try { value = await response.json(); } catch { throw new ServiceUnavailableException('Invalid KDS authentication response'); }
    if (value?.success !== true || typeof value.user?.code !== 'string' || typeof value.user?.name !== 'string'
      || !['Admin', 'Manager', 'Chef', 'Staff'].includes(value.user?.role))
      throw new ServiceUnavailableException('Invalid KDS authentication response');
    return value;
  }

  private user(value: any): QueueUser {
    return { username: value.user.code, name: value.user.name, sourceRole: value.user.role,
      role: value.user.role === 'Admin' ? 'ADMIN' : 'STAFF' };
  }

  async login(pin: string) {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) throw new UnauthorizedException('Invalid PIN');
    const value = await this.request('/auth/login-pin', undefined, pin);
    if (typeof value.token !== 'string' || value.token.length > 4096) throw new ServiceUnavailableException('Invalid KDS authentication response');
    const session = await this.authenticate('Bearer ' + value.token);
    return { success: true, token: value.token, ...session };
  }

  async authenticate(authorization: unknown) {
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || authorization.length > 4103)
      throw new UnauthorizedException();
    const value = await this.request('/auth/session', authorization.slice(7));
    if (!Number.isFinite(value.exp) || value.exp * 1000 <= Date.now()) throw new UnauthorizedException();
    return { user: this.user(value), exp: value.exp };
  }

  isService(authorization: unknown) {
    const key = process.env.KIOSK_QUEUE_KEY;
    if (!key || key.length < 32 || typeof authorization !== 'string') return false;
    const actual = Buffer.from(authorization), expected = Buffer.from('Bearer ' + key);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
