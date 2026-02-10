import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { QueueEntity } from '../queue/entities/queue.entity';

type Filters = {
  profileId?: string;
  from?: string;
  to?: string;
  staffRole?: string;
};

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(QueueEntity)
    private readonly repo: Repository<QueueEntity>,
  ) {}

  private parseRange(from?: string, to?: string) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * 24 * 3600 * 1000);
    return { start, end };
  }

  private filterWhere(filters: Filters) {
    const { start, end } = this.parseRange(filters.from, filters.to);
    const where: any = { date: Between(start, end) };
    if (filters.profileId) where.profileCode = filters.profileId;
    return where;
  }

  async getSummary(filters: Filters) {
    let rows: QueueEntity[] = [];
    try {
      rows = await this.repo.find({ where: this.filterWhere(filters) });
    } catch {
      rows = [];
    }
    let total = 0;
    let waitSum = 0;
    let waitCount = 0;
    let handleSum = 0;
    let handleCount = 0;
    let compliant = 0;
    const WAIT_MAX = 300;
    const HANDLE_MAX = 900;
    let csatSum = 0;
    let csatCount = 0;
    for (const q of rows) {
      total++;
      if (q.startTime && q.checkInTime) {
        const w = (q.startTime.getTime() - q.checkInTime.getTime()) / 1000;
        waitSum += w;
        waitCount++;
      }
      if (q.finishTime && q.startTime) {
        const h = (q.finishTime.getTime() - q.startTime.getTime()) / 1000;
        handleSum += h;
        handleCount++;
      }
      const wOk = q.startTime && q.checkInTime ? ((q.startTime.getTime() - q.checkInTime.getTime()) / 1000) <= WAIT_MAX : false;
      const hOk = q.finishTime && q.startTime ? ((q.finishTime.getTime() - q.startTime.getTime()) / 1000) <= HANDLE_MAX : false;
      if (wOk && hOk) compliant++;
      const csat = q.data?.csat;
      if (typeof csat === 'number') {
        csatSum += csat;
        csatCount++;
      }
    }
    return {
      overallSlaCompliancePct: total ? +(100 * compliant / total).toFixed(2) : 0,
      totalTicketsHandled: total,
      avgWaitTimeSec: waitCount ? +(waitSum / waitCount).toFixed(2) : 0,
      avgHandlingTimeSec: handleCount ? +(handleSum / handleCount).toFixed(2) : 0,
      avgCsatScore: csatCount ? +(csatSum / csatCount).toFixed(2) : null,
    };
  }

  async getHeatmap(filters: Filters & { interval?: string }) {
    let rows: QueueEntity[] = [];
    try {
      rows = await this.repo.find({ where: this.filterWhere(filters) });
    } catch {
      rows = [];
    }
    const map = new Map<string, number>();
    for (const q of rows) {
      const t = q.startTime || q.checkInTime || q.date;
      if (!t) continue;
      const day = t.toLocaleDateString('en', { weekday: 'short' });
      const hour = t.getHours().toString().padStart(2, '0') + ':00';
      const key = `${day}|${hour}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const matrix = days.map(d => {
      const slots = Array.from({ length: 12 }).map((_, i) => {
        const h = (8 + i);
        const hh = h.toString().padStart(2, '0') + ':00';
        const k = `${d}|${hh}`;
        const count = map.get(k) || 0;
        const density = Math.max(0, Math.min(1, count / 50));
        return { start: hh, end: hh, density };
      });
      return { dayOfWeek: d, slots };
    });
    return { interval: filters.interval || '60m', matrix, legend: { min: 0, max: 1 } };
  }

  async getStaffMetrics(filters: Filters & { page?: number; pageSize?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) {
    let rows: QueueEntity[] = [];
    try {
      rows = await this.repo.find({ where: this.filterWhere(filters) });
    } catch {
      rows = [];
    }
    const byStaff = new Map<string, any>();
    for (const q of rows) {
      const staffCode = q.data?.staff?.code || 'UNKNOWN';
      const role = q.data?.staff?.role || 'Unknown';
      const counter = q.data?.staff?.counter || '';
      const obj = byStaff.get(staffCode) || { staffId: staffCode, staffCode, fullName: staffCode, role, counter, ticketsHandled: 0, waitSum: 0, waitCount: 0, handleSum: 0, handleCount: 0, compliant: 0, breaches: 0, csatSum: 0, csatCount: 0 };
      obj.ticketsHandled++;
      if (q.startTime && q.checkInTime) {
        const w = (q.startTime.getTime() - q.checkInTime.getTime()) / 1000;
        obj.waitSum += w;
        obj.waitCount++;
      }
      if (q.finishTime && q.startTime) {
        const h = (q.finishTime.getTime() - q.startTime.getTime()) / 1000;
        obj.handleSum += h;
        obj.handleCount++;
      }
      const wOk = q.startTime && q.checkInTime ? ((q.startTime.getTime() - q.checkInTime.getTime()) / 1000) <= 300 : false;
      const hOk = q.finishTime && q.startTime ? ((q.finishTime.getTime() - q.startTime.getTime()) / 1000) <= 900 : false;
      if (wOk && hOk) obj.compliant++; else obj.breaches++;
      const csat = q.data?.csat;
      if (typeof csat === 'number') {
        obj.csatSum += csat;
        obj.csatCount++;
      }
      byStaff.set(staffCode, obj);
    }
    let list = Array.from(byStaff.values()).map(x => ({
      staffId: x.staffId,
      staffCode: x.staffCode,
      fullName: x.fullName,
      role: x.role,
      counter: x.counter,
      ticketsHandled: x.ticketsHandled,
      avgHandlingTimeSec: x.handleCount ? +(x.handleSum / x.handleCount).toFixed(2) : 0,
      avgWaitTimeSec: x.waitCount ? +(x.waitSum / x.waitCount).toFixed(2) : 0,
      slaCompliancePct: x.ticketsHandled ? +(100 * x.compliant / x.ticketsHandled).toFixed(2) : 0,
      slaBreaches: x.breaches,
      csatScore: x.csatCount ? +(x.csatSum / x.csatCount).toFixed(2) : null,
    }));
    if (filters.staffRole) {
      list = list.filter(x => x.role === filters.staffRole || filters.staffRole === 'All');
    }
    const sortBy = filters.sortBy || 'ticketsHandled';
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => (a[sortBy] > b[sortBy] ? dir : a[sortBy] < b[sortBy] ? -dir : 0));
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const data = list.slice(startIndex, startIndex + pageSize);
    return {
      data,
      meta: { pagination: { page, pageSize, totalItems, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } },
    };
  }

  async exportCsv(filters: Filters) {
    const staff = await this.getStaffMetrics({ ...filters, page: 1, pageSize: 1000, sortBy: 'ticketsHandled', sortDir: 'desc' });
    const rows = staff.data;
    const header = ['StaffId', 'Name', 'Role', 'Counter', 'Tickets', 'AvgHandleSec', 'AvgWaitSec', 'SLA%', 'Breaches', 'CSAT'];
    const lines = [header.join(',')].concat(
      rows.map((r: any) =>
        [r.staffId, r.fullName, r.role, r.counter, r.ticketsHandled, r.avgHandlingTimeSec, r.avgWaitTimeSec, r.slaCompliancePct, r.slaBreaches, r.csatScore ?? ''].join(','),
      ),
    );
    const csv = lines.join('\n');
    const fileName = `perf_staff_${Date.now()}.csv`;
    return { fileName, csv };
  }
}
