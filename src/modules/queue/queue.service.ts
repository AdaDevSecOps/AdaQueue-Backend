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
  ) { }

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
        chanelCode: dto.chanelCode,
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
      } catch { }
      return saved;
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Failed to create queue');
    }
  }

  async generateQueue(dto: CreateQueueDto): Promise<QueueEntity> {
    // let config: any;
    // try {
    //   config = await this.workflowConfig.getWorkflowByIndustry(dto.industry);
    // } catch {
    //   config = { flowCode: dto.industry || 'FLOW_BANK_001', initialState: 'WAITING' };
    // }

    // Generate DocNo (Mocking running number)
    const docNo = `Q${Date.now()}`;

    const attr = dto.attributes || {};
    const queueType = attr.queueType || attr.serviceGroup;

    const displayCode = (attr.kioskCode || attr.displayCode || attr.counter || '') as string;
    const agnCode = dto.agnCode || 'AGN';

    const bchCode = dto.bchCode || '';
    // Backwards compatibility for POS payload: If serviceCode is empty but kitchenCode is provided, use the first kitchenCode.
    const serviceCode = dto.serviceCode || (Array.isArray(dto.kitchenCode) && dto.kitchenCode.length > 0 ? dto.kitchenCode[0] : '') || '';

    // Ensure prefix is only extracted from profile config
    let finalProfileId = dto.profileId;
    let extractedPrefix = '';
    let maxQueueNumber = 999;
    let resetCondition = 'EOD';

    let profile: any = null;

    // First try fetching by profileId
    if (dto.profileId) {
      try {
        profile = await this.workflowConfig.getProfileByCode(dto.profileId);
      } catch (err) { }
    }

    // Fallback to agnCode if profile is still missing
    if (!profile && dto.agnCode) {
      try {
        profile = await this.workflowConfig.getProfileByAgnCode(dto.agnCode);
      } catch (err) { }
    }

    if (profile) {
      finalProfileId = profile.code;
      const serviceGroups = profile.config?.serviceGroups || [];
      let matchedGroup = null;

      if (dto.chanelCode) {
        matchedGroup = serviceGroups.find((g: any) => g.channelCode === dto.chanelCode);
      } else if (dto.attributes && dto.attributes.serviceGroup) {
        matchedGroup = serviceGroups.find((g: any) => g.code === dto.attributes.serviceGroup);
      } else {
        throw new BadRequestException('chanelCode or attributes.serviceGroup is required to resolve prefix context');
      }

      if (matchedGroup) {
        extractedPrefix = matchedGroup.prefix || '';
        if (matchedGroup.maxQueueNumber) maxQueueNumber = matchedGroup.maxQueueNumber;
        if (matchedGroup.resetCondition) resetCondition = matchedGroup.resetCondition;
      } else {
        throw new BadRequestException('Queue Configuration (Service Group) not found for the specified criteria');
      }
    } else {
      throw new BadRequestException('Profile not found for the given profileId or agnCode');
    }

    const seqName = this.sequenceService.buildQueueSequenceName(agnCode, bchCode, extractedPrefix, serviceCode, dto.chanelCode || '');
    let nextNo = 1;
    try {
      await this.sequenceService.ensureQueueSequence(seqName, { max: maxQueueNumber });
      nextNo = await this.sequenceService.next(seqName, maxQueueNumber, resetCondition);
    } catch (err) {
      console.error('Sequence generation failed, using fallback', err);
      // Fallback to random or timestamp if sequence fails to avoid stopping the world
      nextNo = Math.floor(Date.now() % 100000);
    }

    // Dynamic zero-padding based on maxQueueNumber length
    const padLength = String(maxQueueNumber).length;
    let ticketNo = `${extractedPrefix}${String(nextNo).padStart(padLength, '0')}`;

    const newQueue = new QueueEntity({
      docNo: docNo,
      date: new Date(),
      // configCode: config.flowCode, // Simplified
      profileCode: finalProfileId,  // Store Profile ID
      agnCode: dto.agnCode,        // Agency Code
      queueNo: nextNo,
      customerName: dto.customerName,
      tel: dto.tel,
      status: 'WAITING', // Start from Initial State
      queueType: queueType,

      // Dynamic Fields
      refId: dto.refId,
      refType: dto.refType,
      ticketNo: ticketNo,
      data: {
        ...attr,
        queueType,
        profileId: finalProfileId,
        kitchenCode: dto.kitchenCode,  // Explicitly persist kitchenCode from POS
        chanelCode: dto.chanelCode,
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
      } catch { }
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
    } catch { }

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
    } catch { }
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
    } catch { }
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
      } catch { }
    }
    return { action: targetState, updated };
  }

  // Advance Process: STATE_N -> next STATE or FINISH
  async startProcess(docNo: string, industry?: string, targetStatus?: string) {
    const q = await this.getQueue(docNo);
    const oldState = q.status;

    // If frontend already computed the next state, use it directly
    if (targetStatus) {
      let config: any = null;
      try {
        if (industry) config = await this.workflowConfig.getWorkflowByIndustry(industry);
      } catch { }

      const states = (config && (config.states || {})) || {};
      const isFinal = states[targetStatus]?.type === 'FINAL';
      const persistState = isFinal ? 'FINISH' : targetStatus;

      // Try validated transition first
      try {
        if (!isFinal && industry && states[targetStatus]) {
          return await this.changeState(docNo, targetStatus, industry);
        }
      } catch { }

      await this.queueRepository.updateStatus(docNo, persistState);
      const updated = await this.queueRepository.findByDocNo(docNo);
      try {
        await this.eventService.publishLocal(
          EventType.QUEUE_STATE_CHANGED,
          { docNo, newState: persistState, data: updated },
          docNo
        );
      } catch { }

      return { docNo, oldState, newState: persistState, message: 'Process advanced' };
    }

    // Fallback: no targetStatus provided → go to FINISH
    await this.queueRepository.updateStatus(docNo, 'FINISH');
    const updated = await this.queueRepository.findByDocNo(docNo);
    try {
      await this.eventService.publishLocal(
        EventType.QUEUE_STATE_CHANGED,
        { docNo, newState: 'FINISH', data: updated },
        docNo
      );
    } catch { }

    return { docNo, oldState, newState: 'FINISH', message: 'Process advanced' };
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

      // อัพเดทสถานะคิวเป็นค่าที่รับมา (หรือค่าเดิมถ้าเคยถูกข้ามมา) หรือ CALLING เป็นค่า default
      const newStatus = nextQueue.prevStatus || targetStatus || 'CALLING';
      // clearPrevStatus = true เพื่อลบสถานะเดิมทิ้งไปหลังจากการดึงมาใช้แล้ว
      await this.queueRepository.updateStatus(nextQueue.docNo, newStatus, refId, refType, true);

      // ดึงข้อมูลล่าสุดหลังอัพเดท
      const updatedQueue = await this.queueRepository.findByDocNo(nextQueue.docNo);

      try {
        await this.eventService.publishLocal(
          EventType.QUEUE_STATE_CHANGED,
          { docNo: updatedQueue?.docNo, newState: newStatus, data: updatedQueue },
          updatedQueue?.docNo
        );
      } catch { }

      return updatedQueue;
    } catch (error) {
      console.error('[QueueService] Error calling next queue:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to call next queue');
    }
  }

  async skipQueue(docNo: string) {
    const q = await this.getQueue(docNo);
    // ส่งสถานะเดิม (q.status) ไปเก็บไว้ใน prevStatus ก่อนทำการ skip
    await this.queueRepository.skipQueue(docNo, q.status);

    // Fetch updated to publish correctly
    const updated = await this.queueRepository.findByDocNo(docNo);
    try {
      await this.eventService.publishLocal(
        EventType.QUEUE_STATE_CHANGED,
        { docNo, newState: 'WAITING', data: updated },
        docNo
      );
    } catch { }

    return { docNo, newState: 'WAITING', message: 'Ticket skipped successfully' };
  }

  async cancelQueue(docNo: string) {
    const q = await this.getQueue(docNo);
    await this.queueRepository.updateStatus(docNo, 'CANCEL');

    // Fetch updated to publish correctly
    const updated = await this.queueRepository.findByDocNo(docNo);
    try {
      await this.eventService.publishLocal(
        EventType.QUEUE_STATE_CHANGED,
        { docNo, newState: 'CANCEL', data: updated },
        docNo
      );
    } catch { }

    return { docNo, newState: 'CANCEL', message: 'Ticket cancelled successfully' };
  }
}
