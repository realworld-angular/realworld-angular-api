import * as path from 'path';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NamesService } from '../names/names.service';
import { PhotonLocationService } from '../photon/photon-location.service';
import { CreatePizzeriaDto } from './dto/create-pizzeria.dto';
import { UpdatePizzeriaDto } from './dto/update-pizzeria.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Role } from '../common/enums';

const PIZZERIA_SELECT = {
  id: true,
  name: true,
  city: true,
  country: true,
  createdAt: true,
  imageFilename: true,
  owner: { select: { id: true, name: true } },
  _count: { select: { pizzas: true } },
};

function mapPizzeria<T extends { imageFilename: string }>(
  row: T,
): Omit<T, 'imageFilename'> & { image: string } {
  const { imageFilename, ...rest } = row;
  return { ...rest, image: imageFilename };
}

@Injectable()
export class PizzeriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly names: NamesService,
    private readonly photon: PhotonLocationService,
  ) {}

  async findAll(dto: PaginationDto) {
    const { page = 1, limit = 12, search } = dto;
    const skip = (page - 1) * limit;
    const term = search?.trim() ?? '';
    const where =
      term.length > 0
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' as const } },
              { city: { contains: term, mode: 'insensitive' as const } },
              { country: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {};

    const [rows, total] = await Promise.all([
      this.prisma.pizzeria.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: PIZZERIA_SELECT,
      }),
      this.prisma.pizzeria.count({ where }),
    ]);

    return {
      items: rows.map((r) => mapPizzeria(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const row = await this.prisma.pizzeria.findUnique({
      where: { id },
      select: PIZZERIA_SELECT,
    });
    if (!row) throw new NotFoundException('Pizzeria not found');
    return mapPizzeria(row);
  }

  async create(dto: CreatePizzeriaDto, ownerId: string) {
    const existing = await this.prisma.pizzeria.findFirst({
      where: { ownerId },
    });
    if (existing) {
      throw new ConflictException('You already own a pizzeria');
    }
    const filename = this.assertAllowedPizzeriaFilename(dto.imageFilename);
    const city = dto.city.trim();
    const country = dto.country.trim();
    await this.photon.verifyCityCountry(city, country);
    const name = await this.names.generatePizzeriaName();
    const created = await this.prisma.pizzeria.create({
      data: {
        name,
        city,
        country,
        imageFilename: filename,
        ownerId,
      },
      select: PIZZERIA_SELECT,
    });
    return mapPizzeria(created);
  }

  async update(id: string, dto: UpdatePizzeriaDto, userId: string) {
    const existing = await this.assertOwnerRow(id, userId);
    if (dto.imageFilename !== undefined) {
      this.assertAllowedPizzeriaFilename(dto.imageFilename);
    }
    const { city, country, imageFilename, ...rest } = dto;
    if (city !== undefined || country !== undefined) {
      const nextCity = city !== undefined ? city.trim() : existing.city;
      const nextCountry =
        country !== undefined ? country.trim() : existing.country;
      await this.photon.verifyCityCountry(nextCity, nextCountry);
    }
    const data: Record<string, unknown> = { ...rest };
    if (city !== undefined) data.city = city.trim();
    if (country !== undefined) data.country = country.trim();
    if (imageFilename !== undefined) {
      data.imageFilename = this.assertAllowedPizzeriaFilename(imageFilename);
    }
    const updated = await this.prisma.pizzeria.update({
      where: { id },
      data,
      select: PIZZERIA_SELECT,
    });
    return mapPizzeria(updated);
  }

  async remove(id: string, userId: string) {
    await this.assertOwnerRow(id, userId);
    await this.prisma.pizzeria.delete({ where: { id } });
    return { message: 'Pizzeria deleted' };
  }

  async updateMine(dto: UpdatePizzeriaDto, userId: string) {
    const pizzeria = await this.prisma.pizzeria.findFirst({
      where: { ownerId: userId },
    });
    if (!pizzeria) throw new NotFoundException('You do not own a pizzeria');
    return this.update(pizzeria.id, dto, userId);
  }

  async removeMine(userId: string) {
    const pizzeria = await this.prisma.pizzeria.findFirst({
      where: { ownerId: userId },
    });
    if (!pizzeria) throw new NotFoundException('You do not own a pizzeria');
    await this.prisma.pizzeria.delete({ where: { id: pizzeria.id } });
    return { message: 'Pizzeria deleted' };
  }

  async findManagedByUser(userId: string, _role: Role) {
    const rows = await this.prisma.pizzeria.findMany({
      where: { ownerId: userId },
      select: PIZZERIA_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => mapPizzeria(r));
  }

  async findMyPizzeria(userId: string, _role: Role) {
    const row = await this.prisma.pizzeria.findFirst({
      where: { ownerId: userId },
      select: PIZZERIA_SELECT,
    });
    if (!row) throw new NotFoundException('You do not own a pizzeria');
    return mapPizzeria(row);
  }

  private assertAllowedPizzeriaFilename(raw: string): string {
    const name = path.basename(raw.trim());
    if (name !== raw.trim() || name.includes('..') || !name.length) {
      throw new BadRequestException('Invalid image filename');
    }
    return name;
  }

  private async assertOwnerRow(id: string, userId: string) {
    const pizzeria = await this.prisma.pizzeria.findUnique({
      where: { id },
      select: { ownerId: true, city: true, country: true },
    });
    if (!pizzeria) throw new NotFoundException('Pizzeria not found');
    if (pizzeria.ownerId !== userId)
      throw new ForbiddenException('Not your pizzeria');
    return pizzeria;
  }
}
