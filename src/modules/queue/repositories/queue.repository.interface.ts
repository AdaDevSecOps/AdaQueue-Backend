import { QueueEntity } from '../entities/queue.entity';

export interface IQueueRepository {
  create(queue: QueueEntity): Promise<QueueEntity>;
  findByDocNo(docNo: string): Promise<QueueEntity | null>;
  findAllByIndustry(industry: string): Promise<QueueEntity[]>;
  findAllByProfile(profileId: string): Promise<QueueEntity[]>;
  updateStatus(docNo: string, status: string, refId?: string, refType?: string, clearPrevStatus?: boolean): Promise<void>;
  findNextWaiting(profileId?: string, serviceGroup?: string): Promise<QueueEntity | null>;
  skipQueue(docNo: string, oldStatus: string): Promise<void>;
}
