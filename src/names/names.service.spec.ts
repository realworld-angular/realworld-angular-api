import { Test, TestingModule } from '@nestjs/testing';
import { NamesService } from './names.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  pizzeria: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

describe('NamesService', () => {
  let service: NamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NamesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NamesService>(NamesService);
    jest.clearAllMocks();
  });

  describe('generatePizzeriaName', () => {
    it('should return a unique pizzeria name on first attempt', async () => {
      mockPrisma.pizzeria.findUnique.mockResolvedValue(null);

      const name = await service.generatePizzeriaName();

      expect(typeof name).toBe('string');
      expect(name.split(' ')).toHaveLength(2);
    });

    it('should retry until a unique name is found', async () => {
      // First 2 calls return existing, 3rd returns null (unique)
      mockPrisma.pizzeria.findUnique
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce({ id: '2' })
        .mockResolvedValue(null);

      const name = await service.generatePizzeriaName();

      expect(typeof name).toBe('string');
      expect(mockPrisma.pizzeria.findUnique).toHaveBeenCalledTimes(3);
    });

    it('should return a fallback name with numeric suffix after 50 failed attempts', async () => {
      // Simulate all 50 attempts returning existing names
      mockPrisma.pizzeria.findUnique.mockResolvedValue({ id: 'existing' });

      const name = await service.generatePizzeriaName();

      // The fallback name has 3 parts: descriptor + noun + number
      expect(name.split(' ')).toHaveLength(3);
    });
  });

  describe('generatePizzaName', () => {
    it('should return a string with two words', () => {
      const name = service.generatePizzaName();

      expect(typeof name).toBe('string');
      expect(name.split(' ')).toHaveLength(2);
    });

    it('should be synchronous (no DB call)', () => {
      service.generatePizzaName();

      expect(mockPrisma.pizzeria.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('generateName', () => {
    it('should return a unique camelCase display name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const name = await service.generateName();

      // Display names are CamelCase with no spaces
      expect(typeof name).toBe('string');
      expect(name).not.toContain(' ');
    });

    it('should retry until unique', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValue(null);

      const name = await service.generateName();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(typeof name).toBe('string');
    });

    it('should return fallback name with numeric suffix after 50 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const name = await service.generateName();

      // Fallback includes numeric suffix; the string has at least one digit
      expect(/\d/.test(name)).toBe(true);
    });
  });
});
