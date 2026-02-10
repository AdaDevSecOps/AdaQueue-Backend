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

  async updateStatus(docNo: string, status: string): Promise<void> {
    const queue = this.store.get(docNo);
    if (queue) {
      queue.status = status;
      this.store.set(docNo, queue);
    }
  }
}
