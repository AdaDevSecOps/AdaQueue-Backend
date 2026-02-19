import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventService } from './events.service';
import { EventType } from './events.types';

describe('EventService RMQ publish', () => {
  let publishSpy: jest.Mock;
  let assertExchangeSpy: jest.Mock;
  let createConfirmChannelSpy: jest.Mock;
  let connectSpy: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    publishSpy = jest.fn().mockReturnValue(true);
    assertExchangeSpy = jest.fn().mockResolvedValue(undefined);
    createConfirmChannelSpy = jest.fn().mockResolvedValue({
      assertExchange: assertExchangeSpy,
      publish: publishSpy,
    });

    const conn = {
      createConfirmChannel: createConfirmChannelSpy,
      on: jest.fn(),
    };
    connectSpy = jest.fn().mockResolvedValue(conn);

    jest.doMock('amqplib', () => ({
      connect: connectSpy,
    }));

    process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672/';
    process.env.AQ_EVENTS_EXCHANGE = 'aq.events';
  });

  afterEach(() => {
    delete process.env.RABBITMQ_URL;
    delete process.env.AQ_EVENTS_EXCHANGE;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('publishes to RabbitMQ with routing key for QUEUE_CREATED', async () => {
    const { EventService: Svc } = await import('./events.service');
    const svc: InstanceType<typeof EventService> = new Svc(new EventEmitter2());

    await svc.publish(EventType.QUEUE_CREATED, { hello: 'world' }, 'Q123');

    expect(connectSpy).toHaveBeenCalledWith('amqp://guest:guest@localhost:5672/');
    expect(assertExchangeSpy).toHaveBeenCalledWith('aq.events', 'topic', { durable: true });
    expect(publishSpy).toHaveBeenCalled();

    const args = publishSpy.mock.calls[0];
    expect(args[0]).toBe('aq.events'); // exchange
    expect(args[1]).toBe('queue.created'); // routing key
    expect(Buffer.isBuffer(args[2])).toBe(true); // payload buffer
    expect(args[3]).toMatchObject({ persistent: true, contentType: 'application/json' });
  });
});
