import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
} from '@nestjs/common';
import { PizzasService } from './pizzas.service';
import { PrismaService } from '../prisma/prisma.service';
import { NamesService } from '../names/names.service';
import { Role } from '../common/enums';

const mockPrisma = {
  pizza: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  pizzeria: {
    findUnique: jest.fn(),
  },
  pizzeriaStaff: {
    findFirst: jest.fn(),
  },
  pizzaSizeOption: {
    findMany: jest.fn(),
  },
  pizzaToppingOption: {
    findMany: jest.fn(),
  },
};

const mockNames = {
  generatePizzaName: jest.fn(),
};

describe('PizzasService', () => {
  let service: PizzasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PizzasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NamesService, useValue: mockNames },
      ],
    }).compile();

    service = module.get<PizzasService>(PizzasService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all pizzas for the pizzeria', async () => {
      const pizzas = [
        {
          id: '1',
          imageFilename: 'pizza.jpg',
          name: 'X',
          basePrice: 10,
          toppings: [],
        },
      ];
      mockPrisma.pizza.findMany.mockResolvedValue(pizzas);

      const result = await service.findAll('pizzeria-1', {});

      expect(mockPrisma.pizza.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pizzeriaId: 'pizzeria-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual([
        { id: '1', name: 'X', basePrice: 10, toppings: [], image: 'pizza.jpg' },
      ]);
    });

    it('filters by pizza name (trimmed, case-insensitive contains)', async () => {
      mockPrisma.pizza.findMany.mockResolvedValue([]);

      await service.findAll('pizzeria-1', { name: '  smoky  ' });

      expect(mockPrisma.pizza.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            pizzeriaId: 'pizzeria-1',
            name: { contains: 'smoky', mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('create', () => {
    const dto = {
      basePrice: 12.5,
      imageFilename: 'pizza.jpg',
      toppingIds: ['t-1'],
    };

    it('creates a pizza with toppings connected', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: 'p-1',
        ownerId: 'user-1',
      });
      mockNames.generatePizzaName.mockReturnValue('Crispy Salami');
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([{ id: 't-1' }]);
      const created = {
        id: 'pizza-1',
        name: 'Crispy Salami',
        imageFilename: 'pizza.jpg',
        basePrice: dto.basePrice,
        toppings: [{ id: 't-1', label: 'Cheese' }],
      };
      mockPrisma.pizza.create.mockResolvedValue(created);

      const result = await service.create(
        'p-1',
        dto,
        'user-1',
        Role.PIZZERIA_ADMIN,
      );

      expect(mockPrisma.pizzaToppingOption.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['t-1'] } },
        select: { id: true },
      });
      expect(mockPrisma.pizza.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Crispy Salami',
            basePrice: dto.basePrice,
            imageFilename: 'pizza.jpg',
            toppings: { connect: [{ id: 't-1' }] },
          }),
        }),
      );
      expect(result).toEqual({
        id: 'pizza-1',
        name: 'Crispy Salami',
        basePrice: dto.basePrice,
        toppings: [{ id: 't-1', label: 'Cheese' }],
        image: 'pizza.jpg',
      });
    });

    it('throws when topping ids are unknown', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: 'p-1',
        ownerId: 'user-1',
      });
      mockNames.generatePizzaName.mockReturnValue('Crispy Salami');
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([]);

      await expect(
        service.create('p-1', dto, 'user-1', Role.PIZZERIA_ADMIN),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.pizza.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates scalar fields', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: 'p-1',
        ownerId: 'user-1',
      });
      mockPrisma.pizza.findFirst.mockResolvedValue({ id: 'pizza-1' });
      const updated = {
        id: 'pizza-1',
        basePrice: 15,
        imageFilename: 'pizza.jpg',
      };
      mockPrisma.pizza.update.mockResolvedValue(updated);

      const result = await service.update(
        'p-1',
        'pizza-1',
        { basePrice: 15 },
        'user-1',
        Role.PIZZERIA_ADMIN,
      );

      expect(mockPrisma.pizza.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { basePrice: 15 } }),
      );
      expect(result).toEqual({
        id: 'pizza-1',
        basePrice: 15,
        image: 'pizza.jpg',
      });
    });

    it('replaces toppings when toppingIds provided', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: 'p-1',
        ownerId: 'user-1',
      });
      mockPrisma.pizza.findFirst.mockResolvedValue({ id: 'pizza-1' });
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue([
        { id: 't-a' },
        { id: 't-b' },
      ]);
      const updated = { id: 'pizza-1', toppings: [] };
      mockPrisma.pizza.update.mockResolvedValue(updated);

      await service.update(
        'p-1',
        'pizza-1',
        { toppingIds: ['t-a', 't-b'] },
        'user-1',
        Role.PIZZERIA_ADMIN,
      );

      expect(mockPrisma.pizza.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            toppings: {
              set: [{ id: 't-a' }, { id: 't-b' }],
            },
          },
        }),
      );
    });
  });

  describe('remove', () => {
    it('deletes pizza when user is owner', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: 'p-1',
        ownerId: 'user-1',
      });
      mockPrisma.pizza.findFirst.mockResolvedValue({ id: 'pizza-1' });
      mockPrisma.pizza.delete.mockResolvedValue({});

      const result = await service.remove(
        'p-1',
        'pizza-1',
        'user-1',
        Role.PIZZERIA_ADMIN,
      );

      expect(result).toEqual({ message: 'Pizza deleted' });
    });
  });

  describe('findAllSizeOptions', () => {
    it('returns all pizza sizes ordered by sortOrder then price', async () => {
      const options = [
        { id: 's-1', label: 'Small', price: '0.00', sortOrder: 1 },
        { id: 's-2', label: 'Large', price: '2.00', sortOrder: 2 },
      ];
      mockPrisma.pizzaSizeOption.findMany.mockResolvedValue(options);

      const result = await service.findAllSizeOptions();

      expect(mockPrisma.pizzaSizeOption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        }),
      );
      expect(result).toEqual(options);
    });
  });

  describe('findAllToppingOptions', () => {
    it('returns all pizza toppings ordered by sortOrder then price', async () => {
      const options = [
        { id: 't-1', label: 'Cheese', price: '1.00', sortOrder: 1 },
        { id: 't-2', label: 'Olives', price: '1.50', sortOrder: 2 },
      ];
      mockPrisma.pizzaToppingOption.findMany.mockResolvedValue(options);

      const result = await service.findAllToppingOptions();

      expect(mockPrisma.pizzaToppingOption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        }),
      );
      expect(result).toEqual(options);
    });
  });
});
