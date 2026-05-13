import { Test, TestingModule } from '@nestjs/testing';
import { OrderJobService } from './order-job.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../common/enums';
import { OrderEventsService } from '../order-events/order-events.service';

jest.useFakeTimers();

const mockOrderEvents = {
  emit: jest.fn(),
};

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('OrderJobService', () => {
  let service: OrderJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderJobService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderEventsService, useValue: mockOrderEvents },
      ],
    }).compile();

    service = module.get<OrderJobService>(OrderJobService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllTimers();
  });

  describe('onModuleInit / onModuleDestroy', () => {
    it('should start and stop the interval timer', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.onModuleInit();
      expect(setIntervalSpy).toHaveBeenCalled();

      service.onModuleDestroy();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not throw when onModuleDestroy is called without init', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('processOrders (via timer)', () => {
    it('should call order.findMany three times when interval fires and no updates when empty', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(30000);

      expect(mockPrisma.order.findMany).toHaveBeenCalledTimes(3);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockOrderEvents.emit).not.toHaveBeenCalled();
    });

    it('should advance PENDING → PREPARING and emit', async () => {
      mockPrisma.order.findMany.mockImplementation(
        (args: { where: { status: string } }) => {
          if (args.where.status === OrderStatus.PENDING) {
            return Promise.resolve([{ id: 'o1', clientId: 'c1' }]);
          }
          return Promise.resolve([]);
        },
      );
      mockPrisma.order.update.mockResolvedValue({});

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(30000);

      const pendingCall = mockPrisma.order.findMany.mock.calls.find(
        (c) => c[0].where.status === OrderStatus.PENDING,
      );
      expect(pendingCall).toBeDefined();

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o1' },
          data: { status: OrderStatus.PREPARING },
        }),
      );
      expect(mockOrderEvents.emit).toHaveBeenCalledWith('c1', {
        orderId: 'o1',
        status: OrderStatus.PREPARING,
      });
    });

    it('should advance PREPARING → READY in second phase', async () => {
      mockPrisma.order.findMany.mockImplementation(
        (args: { where: { status: string } }) => {
          if (args.where.status === OrderStatus.PREPARING) {
            return Promise.resolve([{ id: 'o2', clientId: 'c2' }]);
          }
          return Promise.resolve([]);
        },
      );
      mockPrisma.order.update.mockResolvedValue({});

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(30000);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o2' },
          data: { status: OrderStatus.READY },
        }),
      );
      expect(mockOrderEvents.emit).toHaveBeenCalledWith('c2', {
        orderId: 'o2',
        status: OrderStatus.READY,
      });
    });

    it('should advance READY → DELIVERED in third phase', async () => {
      mockPrisma.order.findMany.mockImplementation(
        (args: { where: { status: string } }) => {
          if (args.where.status === OrderStatus.READY) {
            return Promise.resolve([{ id: 'o3', clientId: 'c3' }]);
          }
          return Promise.resolve([]);
        },
      );
      mockPrisma.order.update.mockResolvedValue({});

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(30000);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o3' },
          data: { status: OrderStatus.DELIVERED },
        }),
      );
      expect(mockOrderEvents.emit).toHaveBeenCalledWith('c3', {
        orderId: 'o3',
        status: OrderStatus.DELIVERED,
      });
    });

    it('should log error and not throw when findMany rejects', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('DB error'));

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(30000);
    });
  });
});
