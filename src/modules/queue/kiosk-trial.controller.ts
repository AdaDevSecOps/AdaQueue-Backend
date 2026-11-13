import { Body, Controller, Headers, HttpException, Post } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { timingSafeEqual } from 'node:crypto';

@Controller('queue/kiosk-trial')
export class KioskTrialController {
  constructor(private readonly dataSource: DataSource) {}

  @Post()
  async requestQueue(@Headers('authorization') authorization: string, @Body() body: any) {
    const expected = process.env.KIOSK_QUEUE_KEY;
    if (!expected || expected.length < 32) throw new HttpException('TRIAL_QUEUE_NOT_CONFIGURED', 503);
    const received = authorization || '', key = 'Bearer ' + expected;
    if (Buffer.byteLength(received) !== Buffer.byteLength(key)
      || !timingSafeEqual(Buffer.from(received), Buffer.from(key)))
      throw new HttpException('DEVICE_UNAUTHORIZED', 401);
    if (body?.channel !== 'KIOSK_TRIAL' || typeof body.kioskId !== 'string' || !/^[A-Z0-9_-]{1,30}$/.test(body.kioskId)
      || typeof body.branchCode !== 'string' || !/^[0-9]{1,5}$/.test(body.branchCode)
      || typeof body.billId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.billId)
      || typeof body.payloadHash !== 'string' || !/^[0-9a-f]{64}$/.test(body.payloadHash))
      throw new HttpException('INVALID_QUEUE_IDENTITY', 422);
    try {
      const rows = await this.dataSource.query('EXEC dbo.STP_KioskTrialQueue @branch=@0,@channel=@1,@bill=@2,@kiosk=@3,@hash=@4',
        [body.branchCode, body.channel, body.billId, body.kioskId, body.payloadHash]);
      return rows[0];
    } catch (error: any) {
      const code = error?.driverError?.number === 50010 ? 'TRIAL_BILL_NOT_UPLOADED' : 'TRIAL_QUEUE_UNAVAILABLE';
      throw new HttpException(code, code === 'TRIAL_BILL_NOT_UPLOADED' ? 409 : 503);
    }
  }
}
