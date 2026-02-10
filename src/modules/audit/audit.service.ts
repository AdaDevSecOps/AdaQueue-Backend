import { Injectable, Logger } from '@nestjs/common';

export interface AuditEntry {
  action: string;
  target: string;
  user: string;
  reason?: string;
  dataBefore?: any;
  dataAfter?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async log(entry: AuditEntry) {
    this.logger.log(`[AUDIT] ${entry.user} performed ${entry.action} on ${entry.target}. Reason: ${entry.reason || 'N/A'}`);
    // MOCK: Insert into TCNMAuditLog
  }

  async query(filters: any) {
    // MOCK: Select * from TCNMAuditLog where ...
    return [
      { id: '1', date: new Date(), action: 'STATE_CHANGE', user: 'system', target: 'Q123' }
    ];
  }
}
