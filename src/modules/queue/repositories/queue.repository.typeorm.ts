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

  async updateStatus(docNo: string, status: string): Promise<void> {
    await this.repository.update({ docNo }, { status });
  }
}
