import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, OrderStatus } from '../common/enums';
import { OrderEventsService } from '../order-events/order-events.service';
import { PhotonLocationService } from '../photon/photon-location.service';

const mockOrderEvents = { emit: jest.fn() };
const mockPhoton = {
  verifyCityCountry: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  pizza: { findMany: jest.fn() },
  pizzaSizeOption: { findMany: jest.fn() },
  pizzaToppingOption: { findMany: jest.fn() },
  pizzeriaStaff: { findMany: jest.fn(), findFirst: jest.fn() },
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderEventsService, useValue: mockOrderEvents },
        { provide: PhotonLocationService, useValue: mockPhoton },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const deliveryAddr = {
      street: '123 Main St',
      city: 'Naples',
      country: 'Italy',
    };
    const dto = {
      pizzeriaId: 'p-1',
      deliveryAddress: deliveryAddr,
      notes: '',
      items: [
        {
          pizzaId: 'pizza-1',
          quantity: 2,
          selectedSizeId: 'size-1',
          selectedOptionIds: ['top-1'],
        },
      ],
    };

    const prismaOrderRow = {
      id: 'order-1',
      deliveryStreetAddress: '123 Main St',
      deliveryCity: 'Naples',
      deliveryCountry: 'Italy',
      billingStreetAddress: null as string | null,
      billingCity: null as string | null,
      billingCountry: null as string | null,
      notes: null as string | null,
      status: OrderStatus.PENDING,
      total: 26,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      pizzeria: { id: 'pz-1', name: 'Test', city: 'Naples', country: 'Italy' },
      client: { id: 'client-1', name: 'Client' },
      items: [] as unknown[],
    };

    const apiOrderShape = {
      id: 'order-1',
      notes: null,
      status: OrderStatus.PENDING,
      total: 26,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      pizzeria: { id: 'pz-1', name: 'Test', city: 'Naples', country: 'Italy' },
      client: { id: 'client-1', name: 'Client' },
      items: [],
      deliveryAddress: deliveryAddr,
      billingAddress: null,
    };

    it('rejects non-customer roles', async () => {
      await expect(
        service.create(dto, 'admin-1', Role.PIZZERIA_ADMIN),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.pizza.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects delivery addresses that omit city or country', async () => {
      await expect(
        service.create(
          {
            ...dto,
            deliveryAddress: { street: '123 Main St', city: '', country: '' },
          },
          'client-1',
          Role.CUSTOMER,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPhoton.verifyCityCountry).not.toHaveBeenCalled();
      expect(mockPrisma.pizza.findMany).not.toHaveBeenCalled();
    });

    it('creates an order with size + toppings pricing', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([
        { id: 'pizza-1', basePrice: '10.00' },
      ]);
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue([
        { id: 'size-1', label: 'Large', price: '2.00' },
      ]);
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([
        { id: 'top-1', label: 'Cheese', price: '1.00' },
      ]);
      mockPrisma.order.create.mockResolvedValue(prismaOrderRow);

      const result = await service.create(dto, 'client-1', Role.CUSTOMER);

      expect(mockPhoton.verifyCityCountry).toHaveBeenCalledWith(
        'Naples',
        'Italy',
      );
      // unitPrice = 10 + 2 + 1 = 13, total = 13 * 2 = 26
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 26,
            clientId: 'client-1',
            deliveryStreetAddress: '123 Main St',
            deliveryCity: 'Naples',
            deliveryCountry: 'Italy',
            billingStreetAddress: null,
            billingCity: null,
            billingCountry: null,
          }),
        }),
      );
      expect(mockOrderEvents.emit).toHaveBeenCalledWith('client-1', {
        orderId: 'order-1',
        status: OrderStatus.PENDING,
      });
      expect(result).toEqual(apiOrderShape);
    });

    it('throws when a selected size is invalid', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([
        { id: 'pizza-1', basePrice: '10.00' },
      ]);
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue([]);
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([]);

      await expect(
        service.create(dto, 'client-1', Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when a selected topping is invalid', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([
        { id: 'pizza-1', basePrice: '10.00' },
      ]);
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue([
        { id: 'size-1', label: 'Large', price: '2.00' },
      ]);
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([]);

      await expect(
        service.create(dto, 'client-1', Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when a pizza is not from this pizzeria', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([]);

      await expect(
        service.create(dto, 'client-1', Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists null billingAddress when omitted (bills to delivery)', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([
        { id: 'pizza-1', basePrice: '10.00' },
      ]);
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue([
        { id: 'size-1', label: 'Large', price: '2.00' },
      ]);
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([
        { id: 'top-1', label: 'Cheese', price: '1.00' },
      ]);
      mockPrisma.order.create.mockResolvedValue(prismaOrderRow);

      await service.create(dto, 'client-1', Role.CUSTOMER);

      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingStreetAddress: null,
            billingCity: null,
            billingCountry: null,
          }),
        }),
      );
    });

    it('persists null billingAddress when it equals the delivery address', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([
        { id: 'pizza-1', basePrice: '10.00' },
      ]);
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue([
        { id: 'size-1', label: 'Large', price: '2.00' },
      ]);
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([
        { id: 'top-1', label: 'Cheese', price: '1.00' },
      ]);
      mockPrisma.order.create.mockResolvedValue(prismaOrderRow);

      await service.create(
        {
          ...dto,
          billingAddress: {
            street: '123 Main St',
            city: 'Naples',
            country: 'Italy',
          },
        },
        'client-1',
        Role.CUSTOMER,
      );

      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingStreetAddress: null,
            billingCity: null,
            billingCountry: null,
          }),
        }),
      );
    });

    it('persists a distinct billingAddress when different from delivery', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([
        { id: 'pizza-1', basePrice: '10.00' },
      ]);
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue([
        { id: 'size-1', label: 'Large', price: '2.00' },
      ]);
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([
        { id: 'top-1', label: 'Cheese', price: '1.00' },
      ]);
      mockPrisma.order.create.mockResolvedValue({
        ...prismaOrderRow,
        billingStreetAddress: '99 Billing Ave',
        billingCity: 'Paris',
        billingCountry: 'France',
      });

      await service.create(
        {
          ...dto,
          billingAddress: {
            street: '99 Billing Ave',
            city: 'Paris',
            country: 'France',
          },
        },
        'client-1',
        Role.CUSTOMER,
      );

      expect(mockPhoton.verifyCityCountry).toHaveBeenCalledWith(
        'Naples',
        'Italy',
      );
      expect(mockPhoton.verifyCityCountry).toHaveBeenCalledWith(
        'Paris',
        'France',
      );
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingStreetAddress: '99 Billing Ave',
            billingCity: 'Paris',
            billingCountry: 'France',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('returns orders for CUSTOMER filtered by clientId', async () => {
      const rows = [
        {
          id: 'order-1',
          deliveryStreetAddress: '123 Main St',
          deliveryCity: 'Naples',
          deliveryCountry: 'Italy',
          billingStreetAddress: null as string | null,
          billingCity: null as string | null,
          billingCountry: null as string | null,
          notes: null as string | null,
          status: OrderStatus.PENDING,
          total: 1,
          createdAt: new Date(0),
          updatedAt: new Date(0),
          pizzeria: {
            id: 'pz-1',
            name: 'Test',
            city: 'Naples',
            country: 'Italy',
          },
          client: { id: 'user-1', name: 'U' },
          items: [] as unknown[],
        },
      ];
      mockPrisma.order.findMany.mockResolvedValue(rows);

      const result = await service.findAll('user-1', Role.CUSTOMER);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'user-1' } }),
      );
      expect(result).toEqual([
        {
          id: 'order-1',
          notes: null,
          status: OrderStatus.PENDING,
          total: 1,
          createdAt: new Date(0),
          updatedAt: new Date(0),
          pizzeria: {
            id: 'pz-1',
            name: 'Test',
            city: 'Naples',
            country: 'Italy',
          },
          client: { id: 'user-1', name: 'U' },
          items: [],
          deliveryAddress: {
            street: '123 Main St',
            city: 'Naples',
            country: 'Italy',
          },
          billingAddress: null,
        },
      ]);
    });
  });

  describe('findOne', () => {
    const order = {
      id: 'order-1',
      deliveryStreetAddress: '123 Main St',
      deliveryCity: 'Naples',
      deliveryCountry: 'Italy',
      billingStreetAddress: null as string | null,
      billingCity: null as string | null,
      billingCountry: null as string | null,
      notes: null as string | null,
      status: OrderStatus.PENDING,
      total: 10,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      client: { id: 'client-1' },
      pizzeria: {
        id: 'pizzeria-1',
        name: 'Test Pizzeria',
        city: 'Naples',
        country: 'Italy',
        ownerId: 'admin-1',
      },
      items: [] as unknown[],
    };

    it('returns order when user is the client', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await service.findOne(
        'order-1',
        'client-1',
        Role.CUSTOMER,
      );

      expect(result).toEqual({
        id: 'order-1',
        deliveryAddress: {
          street: '123 Main St',
          city: 'Naples',
          country: 'Italy',
        },
        billingAddress: null,
        notes: null,
        status: OrderStatus.PENDING,
        total: 10,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        client: { id: 'client-1' },
        pizzeria: {
          id: 'pizzeria-1',
          name: 'Test Pizzeria',
          city: 'Naples',
          country: 'Italy',
        },
        items: [],
      });
    });

    it('throws when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('missing', 'user-1', Role.CUSTOMER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    const pendingOrder = {
      id: 'order-1',
      clientId: 'client-1',
      status: OrderStatus.PENDING,
      pizzeria: { ownerId: 'admin-1' },
    };

    it('cancels a pending order for the client', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrder);
      const updatedRaw = {
        id: 'order-1',
        deliveryStreetAddress: '123 Main St',
        deliveryCity: 'Naples',
        deliveryCountry: 'Italy',
        billingStreetAddress: null as string | null,
        billingCity: null as string | null,
        billingCountry: null as string | null,
        notes: null as string | null,
        status: OrderStatus.CANCELLED,
        total: 10,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        pizzeria: { id: 'pz-1', name: 'P', city: 'Naples', country: 'Italy' },
        client: { id: 'client-1', name: 'C' },
        items: [] as unknown[],
      };
      mockPrisma.order.update.mockResolvedValue(updatedRaw);

      const result = await service.cancel('order-1', 'client-1', Role.CUSTOMER);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: OrderStatus.CANCELLED },
        }),
      );
      expect(mockOrderEvents.emit).toHaveBeenCalledWith('client-1', {
        orderId: 'order-1',
        status: OrderStatus.CANCELLED,
      });
      expect(result).toEqual({
        id: 'order-1',
        notes: null,
        status: OrderStatus.CANCELLED,
        total: 10,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        pizzeria: { id: 'pz-1', name: 'P', city: 'Naples', country: 'Italy' },
        client: { id: 'client-1', name: 'C' },
        items: [],
        deliveryAddress: {
          street: '123 Main St',
          city: 'Naples',
          country: 'Italy',
        },
        billingAddress: null,
      });
    });

    it('throws for unauthorized user', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrder);

      await expect(
        service.cancel('order-1', 'random-user', Role.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markDelivered', () => {
    const activeOrder = {
      id: 'order-1',
      clientId: 'client-1',
      status: OrderStatus.READY,
      pizzeria: { ownerId: 'admin-1' },
    };

    it('marks an active order as delivered for the pizzeria admin', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(activeOrder);
      const updatedRaw = {
        id: 'order-1',
        deliveryStreetAddress: '123 Main St',
        deliveryCity: 'Naples',
        deliveryCountry: 'Italy',
        billingStreetAddress: null as string | null,
        billingCity: null as string | null,
        billingCountry: null as string | null,
        notes: null as string | null,
        status: OrderStatus.DELIVERED,
        total: 10,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        pizzeria: { id: 'pz-1', name: 'P', city: 'Naples', country: 'Italy' },
        client: { id: 'client-1', name: 'C' },
        items: [] as unknown[],
      };
      mockPrisma.order.update.mockResolvedValue(updatedRaw);

      const result = await service.markDelivered(
        'order-1',
        'admin-1',
        Role.PIZZERIA_ADMIN,
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: OrderStatus.DELIVERED },
        }),
      );
      expect(mockOrderEvents.emit).toHaveBeenCalledWith('client-1', {
        orderId: 'order-1',
        status: OrderStatus.DELIVERED,
      });
      expect(result).toEqual({
        id: 'order-1',
        notes: null,
        status: OrderStatus.DELIVERED,
        total: 10,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        pizzeria: { id: 'pz-1', name: 'P', city: 'Naples', country: 'Italy' },
        client: { id: 'client-1', name: 'C' },
        items: [],
        deliveryAddress: {
          street: '123 Main St',
          city: 'Naples',
          country: 'Italy',
        },
        billingAddress: null,
      });
    });

    it('throws for unauthorized users', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(activeOrder);

      await expect(
        service.markDelivered('order-1', 'client-1', Role.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when order is already cancelled', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...activeOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.markDelivered('order-1', 'admin-1', Role.PIZZERIA_ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.markDelivered('missing', 'admin-1', Role.PIZZERIA_ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
