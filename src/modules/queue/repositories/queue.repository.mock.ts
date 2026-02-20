import { Injectable } from '@nestjs/common';
import { IQueueRepository } from './queue.repository.interface';
import { QueueEntity } from '../entities/queue.entity';

@Injectable()
export class MockQueueRepository implements IQueueRepository {
  private store: Map<string, QueueEntity> = new Map();

  async create(queue: QueueEntity): Promise<QueueEntity> {
    this.store.set(queue.docNo, queue);
    return queue;
  }

  async findByDocNo(docNo: string): Promise<QueueEntity | null> {
    return this.store.get(docNo) || null;
  }

  async findAllByIndustry(industry: string): Promise<QueueEntity[]> {
    // In real DB: SELECT * FROM TQUTQueueTxn WHERE FTQcfCode LIKE ...
    // Here we just mock filtering (Assuming configCode maps to industry for simplicity)
    return Array.from(this.store.values()); 
  }

  async findAllByProfile(profileId: string): Promise<QueueEntity[]> {
    return Array.from(this.store.values());
  }

  async updateStatus(docNo: string, status: string, refId?: string, refType?: string): Promise<void> {
    const queue = this.store.get(docNo);
    if (queue) {
      queue.status = status;
      if (typeof refId === 'string') queue.refId = refId;
      if (typeof refType === 'string') queue.refType = refType;
      this.store.set(docNo, queue);
    }
  }

  async findNextWaiting(profileId?: string, serviceGroup?: string): Promise<QueueEntity | null> {
    const allQueues = Array.from(this.store.values());
    
    // Filter by waiting status (รวม null ด้วย)
    const waitingStatuses = ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING', null];
    let filtered = allQueues.filter(q => waitingStatuses.includes(q.status));
    
    // Filter by profile if provided
    if (profileId) {
      filtered = filtered.filter(q => q.profileCode === profileId);
    }
    
    // Filter by service group if provided
    if (serviceGroup) {
      filtered = filtered.filter(q => (q.data as any)?.serviceGroup === serviceGroup);
    }
    
    // Sort by queue number (oldest first)
    filtered.sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0));
    
    return filtered[0] || null;
  }
}
