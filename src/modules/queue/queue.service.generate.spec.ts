import { QueueService } from './queue.service';

class MockWorkflowEngine {}
class MockWorkflowConfigService {
  async getWorkflowByIndustry(industry: string) {
    return { flowCode: 'FLOW_BANK_001', initialState: 'WAITING' };
  }
}

class MockQueueRepository {
  async create(q: any) {
    return q;
  }
}

class MockSequenceService {
  async testEnsure(_: string) {}
  async next(_: string) { return 1; }
  testBuildName() { return 'SEQ'; }
  buildName() { return 'SEQ'; }
  async ensure(_: string) {}
}

class MockEventService {
  publish = jest.fn();
}

describe('QueueService.generateQueue -> EventService.publish', () => {
  it('publishes QUEUE_CREATED after create', async () => {
    const svc = new QueueService(
      new MockWorkflowEngine() as any,
      new MockWorkflowConfigService() as any,
      new MockQueueRepository() as any,
      new MockSequenceService() as any,
      new MockEventService() as any,
    );

    const dto: any = {
      customerName: 'Walk-in',
      tel: '',
      industry: 'BANK',
      agnCode: 'AGN',
      profileId: 'PROFILE-1',
      attributes: { serviceGroup: 'RESTAURANT' },
      bchCode: '00002',
      preFix: 'W',
      customerType: '00001',
    };

    const result = await svc.generateQueue(dto);
    expect(result).toBeDefined();
    // Ensure publish was called at least once with QUEUE_CREATED
    const es: any = (svc as any)['eventService'];
    expect(es.publish).toHaveBeenCalled();
    const args = es.publish.mock.calls[0];
    expect(args[0]).toBeDefined();
    expect(String(args[0])).toContain('queue.created');
  });
});
