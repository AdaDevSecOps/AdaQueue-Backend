import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { WorkflowEngine } from '../workflow/workflow.engine';
import { WorkflowConfigService } from '../workflow/workflow-config.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { QueueEntity } from './entities/queue.entity';
import { IQueueRepository } from './repositories/queue.repository.interface';
import { SequenceService } from '../sequence/sequence.service';
import { EventService } from '../events/events.service';
import { EventType } from '../events/events.types';

@Injectable()
export class QueueService {
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly workflowConfig: WorkflowConfigService,
    @Inject('IQueueRepository') private readonly queueRepository: IQueueRepository,
    private readonly sequenceService: SequenceService,
    private readonly eventService: EventService
  ) {}

  // Create new Queue (Core Engine Logic)
  async createQueue(dto: CreateQueueDto): Promise<QueueEntity> {
    let config: any;
    try {
      config = await this.workflowConfig.getWorkflowByIndustry(dto.industry);
    } catch {
      config = { flowCode: dto.industry || 'FLOW_BANK_001', initialState: 'WAITING' };
    }
    
    // Generate DocNo (Mocking running number)
    const docNo = `Q${Date.now()}`;
    
    const attr = dto.attributes || {};
    const queueType = attr.queueType || attr.serviceGroup;

    const displayCode = (attr.kioskCode || attr.displayCode || attr.counter || '') as string;
    const agnCode = dto.agnCode || 'AGN';
    
    const seqName = this.sequenceService.buildName(agnCode, dto.profileId || '', displayCode || '', String(queueType || ''));
    let nextNo = 1;
    try {
      await this.sequenceService.ensure(seqName);
      nextNo = await this.sequenceService.next(seqName);
    } catch (err) {
      console.error('Sequence generation failed, using fallback', err);
      // Fallback to random or timestamp if sequence fails to avoid stopping the world
      nextNo = Math.floor(Date.now() % 100000); 
    }

    const newQueue = new QueueEntity({
      docNo: docNo,
      date: new Date(),
      // configCode: config.flowCode, // Simplified
      profileCode: dto.profileId,  // Store Profile ID
      agnCode: dto.agnCode,        // Agency Code
      queueNo: nextNo,
      customerName: dto.customerName,
      tel: dto.tel,
      status: config.initialState || 'WAITING', // Start from Initial State
      queueType: queueType,
      
      // Dynamic Fields
      refId: dto.refId,
      refType: dto.refType,
      data: { 
        ...attr, 
        queueType, 
        profileId: dto.profileId,
        sequenceName: seqName,
        sequenceNo: nextNo,
        queueNo: nextNo
      },
      
      checkInTime: new Date()
    });

    try {
      const saved = await this.queueRepository.create(newQueue);
      try {
        await this.eventService.publish(EventType.QUEUE_CREATED, saved, saved.docNo);
      } catch {}
      return saved;
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Failed to create queue');
    }
  }

  async generateQueue(dto: CreateQueueDto): Promise<QueueEntity> {
    let config: any;
    try {
      config = await this.workflowConfig.getWorkflowByIndustry(dto.industry);
    } catch {
      config = { flowCode: dto.industry || 'FLOW_BANK_001', initialState: 'WAITING' };
    }
    
    // Generate DocNo (Mocking running number)
    const docNo = `Q${Date.now()}`;
    
    const attr = dto.attributes || {};
    const queueType = attr.queueType || attr.serviceGroup;

    const displayCode = (attr.kioskCode || attr.displayCode || attr.counter || '') as string;
    const agnCode = dto.agnCode || 'AGN';

    const bchCode = dto.bchCode || '';
    const preFix = dto.preFix || '';
    const customerType = dto.customerType || '';
    
    const seqName = this.sequenceService.testBuildName(agnCode, bchCode, preFix, customerType);
    let nextNo = 1;
    try {
      await this.sequenceService.testEnsure(seqName);
      nextNo = await this.sequenceService.next(seqName);
    } catch (err) {
      console.error('Sequence generation failed, using fallback', err);
      // Fallback to random or timestamp if sequence fails to avoid stopping the world
      nextNo = Math.floor(Date.now() % 100000); 
    }
    let ticketNo = `${dto.preFix}${String(nextNo).padStart(4, '0')}`;

    const newQueue = new QueueEntity({
      docNo: docNo,
      date: new Date(),
      // configCode: config.flowCode, // Simplified
      profileCode: dto.profileId,  // Store Profile ID
      agnCode: dto.agnCode,        // Agency Code
      queueNo: nextNo,
      customerName: dto.customerName,
      tel: dto.tel,
      status: config.initialState || 'WAITING', // Start from Initial State
      queueType: queueType,
      
      // Dynamic Fields
      refId: dto.refId,
      refType: dto.refType,
      ticketNo: ticketNo,
      data: { 
        ...attr, 
        queueType, 
        profileId: dto.profileId,
        sequenceName: seqName,
        sequenceNo: nextNo,
        queueNo: nextNo,
      },
      
      checkInTime: new Date()
    });

    try {
      const saved = await this.queueRepository.create(newQueue);
      try {
        await this.eventService.publish(EventType.QUEUE_CREATED, saved, saved.docNo);
      } catch {}
      return saved;
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Failed to create queue');
    }
  }

  // Retrieve Queue
  async getQueue(docNo: string): Promise<QueueEntity> {
    const queue = await this.queueRepository.findByDocNo(docNo);
    if (!queue) {
      throw new BadRequestException('Queue not found');
    }
    return queue;
  }

  // Change State
  async changeState(docNo: string, targetState: string, industry: string) {
    const queue = await this.getQueue(docNo);
    const config = await this.workflowConfig.getWorkflowByIndustry(industry);

    // 1. Validate Transition using Workflow Engine
    const result = this.workflowEngine.validateTransition(config, queue.status, targetState);
    if (!result.valid) {
      throw new BadRequestException(result.error);
    }

    // 2. Execute Actions (Async)
    // In real app, we would use result.transition.actions to dispatch events
    await this.workflowEngine.executeStateActions(config, queue.status, targetState, docNo);

    // 3. Update DB
    await this.queueRepository.updateStatus(docNo, targetState);
    
    // 4. Log History
    // MOCK: await this.logRepository.save({ docNo, oldState: queue.status, newState: targetState, date: new Date() });
    
    try {
      await this.eventService.publish(EventType.QUEUE_STATE_CHANGED, { docNo, newState: targetState, industry, data: queue }, docNo);
    } catch {}

    return { docNo, oldState: queue.status, newState: targetState, message: 'State updated successfully' };
  }

  // Get Next Options for UI
  async getNextActions(industry: string, currentStatus: string) {
    const config = await this.workflowConfig.getWorkflowByIndustry(industry);
    return this.workflowEngine.getNextOptions(config, currentStatus);
  }

  // Get Queues by Profile
  async getQueuesByProfile(profileId: string): Promise<QueueEntity[]> {
    // Try by column first
    try {
      const byCol = await this.queueRepository.findAllByProfile(profileId);
      if (byCol && byCol.length) {
        // Fix: Filter by profileId in data JSON because repository might return all (TypeORM repo implementation)
        return byCol.filter(q => q.data?.profileId === profileId);
      }
    } catch {}
    // Fallback: fetch all and filter by JSON profileId
    const all = await this.queueRepository.findAllByIndustry('BANK'); // broad fetch; adjust if needed
    return all.filter(q => q.data?.profileId === profileId);
  }

  // Finish Queue without workflow validation (direct update)
  async finishQueue(docNo: string) {
    const q = await this.getQueue(docNo);
    const old = q.status;
    await this.queueRepository.updateStatus(docNo, 'FINISH');
    try {
      await this.eventService.publishLocal(
        EventType.QUEUE_STATE_CHANGED,
        { docNo, newState: 'FINISH', data: q },
        docNo
      );
    } catch {}
    return { docNo, oldState: old, newState: 'FINISH', message: 'State updated to FINISH' };
  }

  async bulkAction(action: string, docNos: string[], industry: string) {
    const target = (action || '').toUpperCase();
    const map: Record<string, string> = { CANCEL: 'CANCELLED', SKIP: 'SKIPPED' };
    const targetState = map[target] || target;
    let updated = 0;
    for (const docNo of docNos || []) {
      try {
        await this.queueRepository.updateStatus(docNo, targetState);
        updated++;
      } catch {}
    }
    return { action: targetState, updated };
  }

  // Advance Process: STATE_2 -> STATE_3 -> FINAL
  async startProcess(docNo: string, industry?: string) {
    const q = await this.getQueue(docNo);
    const oldState = q.status;

    let config: any = null;
    try {
      if (industry) config = await this.workflowConfig.getWorkflowByIndustry(industry);
    } catch {}

    const states = (config && (config.states || {})) || {};

    let next: string | null = null;
    if (oldState === 'STATE_2') {
      next = states['STATE_3'] ? 'STATE_3' : 'STATE_3';
    } else if (oldState === 'STATE_3') {
      if (states['STATE_4']) next = 'STATE_4';
      else if (states['COMPLETED']) next = 'COMPLETED';
      else next = 'FINISH';
    } else {
      // If unknown current state, attempt to complete
      next = 'FINISH';
    }

    // Try workflow validation first; fallback to direct update
    try {
      if (industry && next && states[next]) {
        return await this.changeState(docNo, next, industry);
      }
    } catch {}

    await this.queueRepository.updateStatus(docNo, next || 'FINISH');
    const updated = await this.queueRepository.findByDocNo(docNo);
    try {
      await this.eventService.publishLocal(
        EventType.QUEUE_STATE_CHANGED,
        { docNo, newState: next || 'FINISH', data: updated },
        docNo
      );
    } catch {}

    return { docNo, oldState, newState: next || 'FINISH', message: 'Process advanced' };
  }

  async getNextNumber(profileId?: string, serviceGroup?: string): Promise<number> {
    try {
      const all = await this.queueRepository.findAllByProfile(profileId || '');
      let max = 0;
      for (const q of all) {
        const sg = (q as any).data?.serviceGroup;
        const pid = (q as any).data?.profileId;
        if (sg === serviceGroup && (!profileId || pid === profileId)) {
          if (typeof q.queueNo === 'number' && q.queueNo > max) max = q.queueNo;
        }
      }
      return max + 1;
    } catch {
      return Math.floor(Math.random() * 1000);
    }
  }

  private async nextRunningNumber(profileId?: string, serviceGroup?: string): Promise<number> {
    return this.getNextNumber(profileId, serviceGroup);
  }

  // Call Next Queue - ดึงคิวถัดไปที่รออยู่
  async callNextQueue(docNo?: string, profileId?: string, serviceGroup?: string, targetStatus?: string, refId?: string, refType?: string): Promise<QueueEntity | null> {
    try {
      let nextQueue: QueueEntity | null = null;

      // กรณี 1: ถ้ามี docNo = ข้ามคิว (เลือกคิวเฉพาะ)
      if (docNo) {
        nextQueue = await this.queueRepository.findByDocNo(docNo);
        
        if (!nextQueue) {
          throw new BadRequestException(`Queue with docNo ${docNo} not found`);
        }
        
        // ตรวจสอบว่าคิวอยู่ในสถานะที่สามารถเรียกได้
        const allowedStatuses = ['WAITING', 'WAIT', 'WAIT_TABLE', 'PENDING', null];
        if (!allowedStatuses.includes(nextQueue.status)) {
          throw new BadRequestException(
            `Cannot call queue with status: ${nextQueue.status}. Allowed statuses: WAITING, WAIT, WAIT_TABLE, PENDING, or null`
          );
        }
      } 
      // กรณี 2: ไม่มี docNo = ค้นหาคิวถัดไปที่รออยู่
      else {
        nextQueue = await this.queueRepository.findNextWaiting(profileId, serviceGroup);
        
        if (!nextQueue) {
          return null; // ไม่มีคิวที่รออยู่
        }
      }
      
      // อัพเดทสถานะคิวเป็นค่าที่รับมา หรือ CALLING เป็นค่า default
      const newStatus = targetStatus || 'CALLING';
      await this.queueRepository.updateStatus(nextQueue.docNo, newStatus, refId, refType);
      
      // ดึงข้อมูลล่าสุดหลังอัพเดท
      const updatedQueue = await this.queueRepository.findByDocNo(nextQueue.docNo);
      
      try {
        await this.eventService.publishLocal(
          EventType.QUEUE_STATE_CHANGED,
          { docNo: updatedQueue?.docNo, newState: newStatus, data: updatedQueue },
          updatedQueue?.docNo
        );
      } catch {}
      
      return updatedQueue;
    } catch (error) {
      console.error('[QueueService] Error calling next queue:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to call next queue');
    }
  }
}
