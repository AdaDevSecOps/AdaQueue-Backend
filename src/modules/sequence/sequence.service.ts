import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SequenceService {
  constructor(private readonly dataSource: DataSource) {}

  private sanitizeId(input: string) {
    const s = (input || '').trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    return s.substring(0, 128);
  }

  buildName(agnCode: string, profileCode: string, displayCode: string, name: string) {
    const a = this.sanitizeId(agnCode);
    const p = this.sanitizeId(profileCode);
    const d = this.sanitizeId(displayCode);
    const n = this.sanitizeId(name);
    const joined = [a, p, d, n].filter(Boolean).join('_');
    return joined || 'SEQ_DEFAULT';
  }

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

  async next(name: string) {
    const qn = name.replace(/]/g, ']]');
    await this.resetIfNewDay(name);
    const sql = `SELECT NEXT VALUE FOR dbo.[${qn}] AS nextVal`;
    const rows = await this.dataSource.query(sql);
    const v = rows?.[0]?.nextVal ?? rows?.[0];
    const num = typeof v === 'number' ? v : parseInt(String(v || '0'), 10);
    
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

  async preview(name: string) {
    await this.resetIfNewDay(name);
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

  private todayYmd() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dd}`;
  }

  private async resetIfNewDay(name: string) {
    const qn = name.replace(/]/g, ']]');
    const ymd = this.todayYmd();
    const checkSql = `SELECT CAST(value as nvarchar(128)) AS v FROM sys.extended_properties WHERE name=N'ADA_LAST_RESET_YMD' AND major_id = OBJECT_ID(N'dbo.[${qn}]')`;
    try {
      const r = await this.dataSource.query(checkSql);
      const last = r?.[0]?.v as string | undefined;
      if (last !== ymd) {
        await this.dataSource.query(`ALTER SEQUENCE dbo.[${qn}] RESTART WITH 1`);
        
        // Update YMD and Reset STARTED flag to 0
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
    } catch {
      // ignore
    }
  }
}
