import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SequenceService {
  constructor(private readonly dataSource: DataSource) { }

  private sanitizeId(input: string) {
    const s = (input || '').trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    return s.substring(0, 128);
  }

  // สร้างชื่อ sequence จาก agnCode, profileCode, displayCode, name
  buildName(agnCode: string, profileCode: string, displayCode: string, name: string) {
    const a = this.sanitizeId(agnCode);
    const p = this.sanitizeId(profileCode);
    const d = this.sanitizeId(displayCode);
    const n = this.sanitizeId(name);
    const joined = [a, p, d, n].filter(Boolean).join('_');
    return joined || 'SEQ_DEFAULT';
  }

  // เพิ่ม sequence ถ้ายังไม่มี ใน schema dbo
  async ensure(name: string, opts?: { start?: number; increment?: number; min?: number; max?: number; cycle?: boolean; cache?: number }) {
    const start = opts?.start ?? 1;
    const inc = opts?.increment ?? 1;
    const min = opts?.min ?? 1;
    const max = opts?.max ?? 999;
    const cycle = opts?.cycle ?? true;
    const cache = opts?.cache ?? 20;
    const qn = name.replace(/]/g, ']]');
    // Use direct string injection since name is sanitized (A-Z0-9_)
    const sqlCheck = `SELECT 1 FROM sys.sequences WHERE name = '${qn}' AND schema_id = SCHEMA_ID('dbo')`;
    const exists = await this.dataSource.query(sqlCheck);
    if (exists && exists.length) return;
    const ddl = `CREATE SEQUENCE dbo.[${qn}] AS INT START WITH ${start} INCREMENT BY ${inc} MINVALUE ${min} MAXVALUE ${max} ${cycle ? 'CYCLE' : ''} CACHE ${cache}`;
    await this.dataSource.query(ddl);
  }

  // [Test] สร้างชื่อ sequence 
  buildQueueSequenceName(agnCode: string, bchCode: string, preFix: string, serviceCode: string, chanelCode: string) {
    const agn = agnCode ? 'SG_AGN' + agnCode : '';
    const bch = bchCode ? 'BCH' + bchCode : '';
    const chn = chanelCode ? 'CH' + chanelCode : '';
    const srvCode = (serviceCode === '00001') ? 'KIOSK' : 'POS';
    const prefix = preFix ? 'Q' + preFix : '';
    const a = this.sanitizeId(agn + bch);
    const c = this.sanitizeId(chn);
    const p = this.sanitizeId(srvCode);
    const d = this.sanitizeId(prefix);
    const joined = [a, c, p, d].filter(Boolean).join('_');
    return joined || 'SEQ_DEFAULT';
  }

  // [Test] เพิ่ม sequence ถ้ายังไม่มี ใน schema dbo
  async ensureQueueSequence(name: string, opts?: { start?: number; increment?: number; min?: number; max?: number; cycle?: boolean; cache?: number }) {
    const start = opts?.start ?? 1;
    const inc = opts?.increment ?? 1;
    const min = opts?.min ?? 1;
    const max = opts?.max ?? 999;
    const cycle = opts?.cycle ?? true;
    const cache = opts?.cache ?? 20;
    const qn = name.replace(/]/g, ']]');
    // Use direct string injection since name is sanitized (A-Z0-9_)
    const sqlCheck = `SELECT 1 FROM sys.sequences WHERE name = '${qn}' AND schema_id = SCHEMA_ID('dbo')`;
    const exists = await this.dataSource.query(sqlCheck);
    if (exists && exists.length) return;
    const ddl = `CREATE SEQUENCE dbo.[${qn}] AS INT START WITH ${start} INCREMENT BY ${inc} MINVALUE ${min} MAXVALUE ${max} ${cycle ? 'CYCLE' : ''} CACHE ${cache}`;
    await this.dataSource.query(ddl);
  }

  async next(name: string, maxQueueNumber: number = 999, resetCondition: string = 'EOD') {
    const qn = name.replace(/]/g, ']]');
    await this.resetIfConditionMet(name, resetCondition);

    const sql = `SELECT NEXT VALUE FOR dbo.[${qn}] AS nextVal`;
    let rows = await this.dataSource.query(sql);
    let v = rows?.[0]?.nextVal ?? rows?.[0];
    let num = typeof v === 'number' ? v : parseInt(String(v || '0'), 10);

    // Check MaxQueueNumber Roll-over
    if (num > maxQueueNumber) {
      await this.dataSource.query(`ALTER SEQUENCE dbo.[${qn}] RESTART WITH 1`);
      rows = await this.dataSource.query(sql);
      v = rows?.[0]?.nextVal ?? rows?.[0];
      num = typeof v === 'number' ? v : parseInt(String(v || '0'), 10);
    }

    try {
      const markSql = `
            IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE name=N'ADA_SEQ_STARTED' AND major_id = OBJECT_ID(N'dbo.[${qn}]') AND value = N'1')
            BEGIN
                IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE name=N'ADA_SEQ_STARTED' AND major_id = OBJECT_ID(N'dbo.[${qn}]'))
                    EXEC sys.sp_updateextendedproperty @name=N'ADA_SEQ_STARTED', @value=N'1', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
                ELSE
                    EXEC sys.sp_addextendedproperty @name=N'ADA_SEQ_STARTED', @value=N'1', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
            END
        `;
      await this.dataSource.query(markSql);
    } catch (e) {
      // ignore error
    }

    return num;
  }

  async preview(name: string, maxQueueNumber: number = 999, resetCondition: string = 'EOD') {
    await this.resetIfConditionMet(name, resetCondition);
    const qn = name.replace(/]/g, ']]');
    const sql = `
      SELECT
        s.start_value AS startValue,
        s.increment AS inc,
        s.maximum_value AS maxValue,
        s.is_cycling AS isCycle,
        s.current_value AS currentValue,
        (SELECT CAST(value AS nvarchar(10)) FROM sys.extended_properties WHERE name = 'ADA_SEQ_STARTED' AND major_id = s.object_id) as startedFlag
      FROM sys.sequences s
      WHERE s.name = '${qn}' AND s.schema_id = SCHEMA_ID('dbo')
    `;
    const rows = await this.dataSource.query(sql);
    if (!rows || !rows.length) return { next: 1 };
    const r = rows[0];
    const curr = typeof r.currentValue === 'number' ? r.currentValue : parseInt(String(r.currentValue || '0'), 10);
    const inc = typeof r.inc === 'number' ? r.inc : parseInt(String(r.inc || '1'), 10);
    const max = typeof r.maxValue === 'number' ? r.maxValue : parseInt(String(r.maxValue || '999'), 10);
    const cyc = !!r.isCycle;
    const isStarted = r.startedFlag === '1';

    // If not started yet, next value is the start value (usually 1)
    if (!isStarted) {
      return { next: r.startValue || 1 };
    }

    let next = curr ? curr + inc : r.startValue || 1;
    if (next > max) next = cyc ? r.startValue || 1 : max;
    return { next };
  }

  private getWeekString(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private todayYmd() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dd}`;
  }

  private async resetIfConditionMet(name: string, resetCondition: string) {
    const qn = name.replace(/]/g, ']]');

    if (resetCondition === '7DAYS') {
      const weekStr = this.getWeekString(new Date());
      const checkSql = `SELECT CAST(value as nvarchar(128)) AS v FROM sys.extended_properties WHERE name=N'ADA_LAST_RESET_WEEK' AND major_id = OBJECT_ID(N'dbo.[${qn}]')`;
      try {
        const r = await this.dataSource.query(checkSql);
        const last = r?.[0]?.v as string | undefined;
        if (last !== weekStr) {
          await this.dataSource.query(`ALTER SEQUENCE dbo.[${qn}] RESTART WITH 1`);
          const upd = `
              IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE name=N'ADA_LAST_RESET_WEEK' AND major_id = OBJECT_ID(N'dbo.[${qn}]'))
                  EXEC sys.sp_updateextendedproperty @name=N'ADA_LAST_RESET_WEEK', @value=N'${weekStr}', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
              ELSE
                  EXEC sys.sp_addextendedproperty @name=N'ADA_LAST_RESET_WEEK', @value=N'${weekStr}', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';

              IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE name=N'ADA_SEQ_STARTED' AND major_id = OBJECT_ID(N'dbo.[${qn}]'))
                  EXEC sys.sp_updateextendedproperty @name=N'ADA_SEQ_STARTED', @value=N'0', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
              ELSE
                  EXEC sys.sp_addextendedproperty @name=N'ADA_SEQ_STARTED', @value=N'0', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
          `;
          await this.dataSource.query(upd);
        }
      } catch { }
    } else {
      // EOD or default
      const ymd = this.todayYmd();
      const checkSql = `SELECT CAST(value as nvarchar(128)) AS v FROM sys.extended_properties WHERE name=N'ADA_LAST_RESET_YMD' AND major_id = OBJECT_ID(N'dbo.[${qn}]')`;
      try {
        const r = await this.dataSource.query(checkSql);
        const last = r?.[0]?.v as string | undefined;
        if (last !== ymd) {
          await this.dataSource.query(`ALTER SEQUENCE dbo.[${qn}] RESTART WITH 1`);
          const upd = `
              IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE name=N'ADA_LAST_RESET_YMD' AND major_id = OBJECT_ID(N'dbo.[${qn}]'))
                  EXEC sys.sp_updateextendedproperty @name=N'ADA_LAST_RESET_YMD', @value=N'${ymd}', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
              ELSE
                  EXEC sys.sp_addextendedproperty @name=N'ADA_LAST_RESET_YMD', @value=N'${ymd}', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';

              IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE name=N'ADA_SEQ_STARTED' AND major_id = OBJECT_ID(N'dbo.[${qn}]'))
                  EXEC sys.sp_updateextendedproperty @name=N'ADA_SEQ_STARTED', @value=N'0', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
              ELSE
                  EXEC sys.sp_addextendedproperty @name=N'ADA_SEQ_STARTED', @value=N'0', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'SEQUENCE', @level1name=N'${name}';
          `;
          await this.dataSource.query(upd);
        }
      } catch { }
    }
  }
}
