import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PizzeriasService } from './pizzerias.service';
import { PrismaService } from '../prisma/prisma.service';
import { NamesService } from '../names/names.service';
import { PhotonLocationService } from '../photon/photon-location.service';
import { Role } from '../common/enums';

const mockPrisma = {
  pizzeria: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockNames = {
  generatePizzeriaName: jest.fn(),
};

const mockPhoton = {
  verifyCityCountry: jest.fn().mockResolvedValue(undefined),
};

describe('PizzeriasService', () => {
  let service: PizzeriasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PizzeriasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NamesService, useValue: mockNames },
        { provide: PhotonLocationService, useValue: mockPhoton },
      ],
    }).compile();

    service = module.get<PizzeriasService>(PizzeriasService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated data', async () => {
      const rows = [
        { id: '1', name: 'Crispy Corner', imageFilename: 'pizzeria.jpg' },
      ];
      mockPrisma.pizzeria.findMany.mockResolvedValue(rows);
      mockPrisma.pizzeria.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 12 });

      expect(result).toEqual({
        items: [{ id: '1', name: 'Crispy Corner', image: 'pizzeria.jpg' }],
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      });
    });

    it('should use default page and limit when not provided', async () => {
      mockPrisma.pizzeria.findMany.mockResolvedValue([]);
      mockPrisma.pizzeria.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(12);
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.pizzeria.findMany.mockResolvedValue([]);
      mockPrisma.pizzeria.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 1, limit: 12 });

      expect(result.totalPages).toBe(3);
    });

    it('should filter by trimmed search on name only', async () => {
      mockPrisma.pizzeria.findMany.mockResolvedValue([]);
      mockPrisma.pizzeria.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 12, search: '  corner  ' });

      const expectedWhere = {
        OR: [
          { name: { contains: 'corner', mode: 'insensitive' } },
          { city: { contains: 'corner', mode: 'insensitive' } },
          { country: { contains: 'corner', mode: 'insensitive' } },
        ],
      };
      expect(mockPrisma.pizzeria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(mockPrisma.pizzeria.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('should omit search filter when search is blank', async () => {
      mockPrisma.pizzeria.findMany.mockResolvedValue([]);
      mockPrisma.pizzeria.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 12, search: '   ' });

      expect(mockPrisma.pizzeria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(mockPrisma.pizzeria.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('findOne', () => {
    it('should return a pizzeria when found', async () => {
      const pizzeria = {
        id: '1',
        name: 'Smoky Oven',
        imageFilename: 'pizzeria.jpg',
      };
      mockPrisma.pizzeria.findUnique.mockResolvedValue(pizzeria);

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: '1',
        name: 'Smoky Oven',
        image: 'pizzeria.jpg',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should generate a name and create pizzeria', async () => {
      mockPrisma.pizzeria.findFirst.mockResolvedValue(null);
      mockNames.generatePizzeriaName.mockResolvedValue('Crispy Corner');
      const created = {
        id: '1',
        name: 'Crispy Corner',
        imageFilename: 'pizzeria.jpg',
      };
      mockPrisma.pizzeria.create.mockResolvedValue(created);

      const result = await service.create(
        { city: 'Naples', country: 'Italy', imageFilename: 'pizzeria.jpg' },
        'owner-1',
      );

      expect(mockNames.generatePizzeriaName).toHaveBeenCalled();
      expect(mockPhoton.verifyCityCountry).toHaveBeenCalledWith(
        'Naples',
        'Italy',
      );
      expect(mockPrisma.pizzeria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Crispy Corner',
            city: 'Naples',
            country: 'Italy',
            ownerId: 'owner-1',
            imageFilename: 'pizzeria.jpg',
          }),
        }),
      );
      expect(result).toEqual({
        id: '1',
        name: 'Crispy Corner',
        image: 'pizzeria.jpg',
      });
    });

    it('should reject disallowed pizzeria image filenames', async () => {
      mockPrisma.pizzeria.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { city: 'Naples', country: 'Italy', imageFilename: '../unknown.jpg' },
          'owner-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.pizzeria.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update pizzeria when user is owner', async () => {
      const pizzeria = {
        id: '1',
        ownerId: 'owner-1',
        city: 'Naples',
        country: 'Italy',
      };
      mockPrisma.pizzeria.findUnique.mockResolvedValueOnce(pizzeria);
      const updated = {
        id: '1',
        name: 'New Name',
        imageFilename: 'pizzeria.jpg',
      };
      mockPrisma.pizzeria.update.mockResolvedValue(updated);

      const result = await service.update('1', { city: 'Rome' }, 'owner-1');

      expect(mockPhoton.verifyCityCountry).toHaveBeenCalledWith(
        'Rome',
        'Italy',
      );
      expect(result).toEqual({
        id: '1',
        name: 'New Name',
        image: 'pizzeria.jpg',
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: '1',
        ownerId: 'owner-1',
      });

      await expect(service.update('1', {}, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when pizzeria does not exist', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete pizzeria when user is owner', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: '1',
        ownerId: 'owner-1',
      });
      mockPrisma.pizzeria.delete.mockResolvedValue({});

      const result = await service.remove('1', 'owner-1');

      expect(mockPrisma.pizzeria.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual({ message: 'Pizzeria deleted' });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue({
        id: '1',
        ownerId: 'owner-1',
      });

      await expect(service.remove('1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findManagedByUser', () => {
    it('should return pizzerias for an admin owner', async () => {
      const items = [
        { id: '1', imageFilename: 'pizzeria.jpg' },
        { id: '2', imageFilename: 'pizzeria.jpg' },
      ];
      mockPrisma.pizzeria.findMany.mockResolvedValue(items);

      const result = await service.findManagedByUser(
        'owner-1',
        Role.PIZZERIA_ADMIN,
      );

      expect(mockPrisma.pizzeria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 'owner-1' } }),
      );
      expect(result).toEqual([
        { id: '1', image: 'pizzeria.jpg' },
        { id: '2', image: 'pizzeria.jpg' },
      ]);
    });
  });
});
