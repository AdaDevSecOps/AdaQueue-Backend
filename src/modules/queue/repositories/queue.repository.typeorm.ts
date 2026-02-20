import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IQueueRepository } from './queue.repository.interface';
import { QueueEntity } from '../entities/queue.entity';

@Injectable()
export class TypeOrmQueueRepository implements IQueueRepository {
  constructor(
    @InjectRepository(QueueEntity)
    private readonly repository: Repository<QueueEntity>,
  ) {}

  async create(queue: QueueEntity): Promise<QueueEntity> {
    return await this.repository.save(queue);
  }

  async findByDocNo(docNo: string): Promise<QueueEntity | null> {
    return await this.repository.findOne({ where: { docNo } });
  }

  async findAllByIndustry(industry: string): Promise<QueueEntity[]> {
    // Assuming configCode maps to industry or filtering by configCode
    // return await this.repository.find({ where: { configCode: industry } });
    return [];
  }

  async findAllByProfile(profileId: string): Promise<QueueEntity[]> {
    return await this.repository.find({ where: { profileCode: profileId } });
  }

  async updateStatus(docNo: string, status: string, refId?: string, refType?: string): Promise<void> {
    const update: Partial<QueueEntity> = { status };
    if (typeof refId === 'string') update.refId = refId;
    if (typeof refType === 'string') update.refType = refType;
    await this.repository.update({ docNo }, update);
  }

  async findNextWaiting(profileId?: string, serviceGroup?: string): Promise<QueueEntity | null> {
    const queryBuilder = this.repository.createQueryBuilder('queue');
    
    // Filter by waiting status (รวม null ด้วย)
    queryBuilder.where('(queue.status IS NULL OR queue.status IN (:...statuses))', { 
      statuses: ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING'] 
    });
    
    // Filter by profile if provided
    if (profileId) {
      queryBuilder.andWhere('queue.profileCode = :profileId', { profileId });
    }
    
    // Filter by service group if provided (in JSON data field)
    if (serviceGroup) {
      queryBuilder.andWhere("JSON_VALUE(queue.FTQtxDataJson, '$.serviceGroup') = :serviceGroup", { serviceGroup });
    }
    
    // Order by queue number (oldest first)
    queryBuilder.orderBy('queue.date', 'ASC');
    
    return await queryBuilder.getOne();
  }
}
