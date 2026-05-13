import * as path from 'path';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NamesService } from '../names/names.service';
import { CreatePizzaDto } from './dto/create-pizza.dto';
import { UpdatePizzaDto } from './dto/update-pizza.dto';
import { Role } from '../common/enums';

const PIZZA_SELECT = {
  id: true,
  name: true,
  basePrice: true,
  createdAt: true,
  imageFilename: true,
  toppings: {
    select: { id: true, label: true, price: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' as const }, { label: 'asc' as const }],
  },
};

function mapPizza<T extends { imageFilename: string }>(
  row: T,
): Omit<T, 'imageFilename'> & { image: string } {
  const { imageFilename, ...rest } = row;
  return { ...rest, image: imageFilename };
}

@Injectable()
export class PizzasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly names: NamesService,
  ) {}

  async findAll(pizzeriaId: string, nameContains?: string) {
    const trimmedName = nameContains?.trim();
    const nameFilter = trimmedName
      ? { name: { contains: trimmedName, mode: 'insensitive' as const } }
      : {};
    const rows = await this.prisma.pizza.findMany({
      where: {
        pizzeriaId,
        ...nameFilter,
      },
      select: PIZZA_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => mapPizza(r));
  }

  async findOne(pizzeriaId: string, pizzaId: string) {
    const row = await this.prisma.pizza.findFirst({
      where: { id: pizzaId, pizzeriaId },
      select: PIZZA_SELECT,
    });
    if (!row) throw new NotFoundException('Pizza not found');
    return mapPizza(row);
  }

  async create(
    pizzeriaId: string,
    dto: CreatePizzaDto,
    userId: string,
    userRole: Role,
  ) {
    await this.assertCanManage(pizzeriaId, userId, userRole);
    const name = this.names.generatePizzaName();
    await this.assertValidToppingIds(dto.toppingIds);
    const filename = this.assertAllowedPizzaFilename(dto.imageFilename);

    const created = await this.prisma.pizza.create({
      data: {
        pizzeriaId,
        name,
        basePrice: dto.basePrice,
        imageFilename: filename,
        toppings: {
          connect: dto.toppingIds.map((id) => ({ id })),
        },
      },
      select: PIZZA_SELECT,
    });
    return mapPizza(created);
  }

  async update(
    pizzeriaId: string,
    pizzaId: string,
    dto: UpdatePizzaDto,
    userId: string,
    userRole: Role,
  ) {
    await this.assertCanManage(pizzeriaId, userId, userRole);
    await this.assertPizzaExists(pizzeriaId, pizzaId);
    if (dto.imageFilename !== undefined) {
      this.assertAllowedPizzaFilename(dto.imageFilename);
    }

    const data: {
      basePrice?: number;
      imageFilename?: string;
      toppings?: { set: { id: string }[] };
    } = {};
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (dto.imageFilename !== undefined) {
      data.imageFilename = this.assertAllowedPizzaFilename(dto.imageFilename);
    }
    if (dto.toppingIds !== undefined) {
      await this.assertValidToppingIds(dto.toppingIds);
      data.toppings = {
        set: dto.toppingIds.map((id) => ({ id })),
      };
    }

    const updated = await this.prisma.pizza.update({
      where: { id: pizzaId },
      data,
      select: PIZZA_SELECT,
    });
    return mapPizza(updated);
  }

  async remove(
    pizzeriaId: string,
    pizzaId: string,
    userId: string,
    userRole: Role,
  ) {
    await this.assertCanManage(pizzeriaId, userId, userRole);
    await this.assertPizzaExists(pizzeriaId, pizzaId);
    await this.prisma.pizza.delete({ where: { id: pizzaId } });
    return { message: 'Pizza deleted' };
  }

  async findAllSizeOptions() {
    return this.prisma.pizzaSizeOption.findMany({
      select: { id: true, label: true, price: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async findAllToppingOptions() {
    return this.prisma.pizzaToppingOption.findMany({
      select: { id: true, label: true, price: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  private assertAllowedPizzaFilename(raw: string): string {
    const name = path.basename(raw.trim());
    if (name !== raw.trim() || name.includes('..') || !name.length) {
      throw new BadRequestException('Invalid image filename');
    }
    return name;
  }

  private async assertCanManage(
    pizzeriaId: string,
    userId: string,
    _role: Role,
  ) {
    const pizzeria = await this.prisma.pizzeria.findUnique({
      where: { id: pizzeriaId },
    });
    if (!pizzeria) throw new NotFoundException('Pizzeria not found');
    if (pizzeria.ownerId === userId) return;
    throw new ForbiddenException('Not authorized to manage this pizzeria');
  }

  private async assertPizzaExists(pizzeriaId: string, pizzaId: string) {
    const pizza = await this.prisma.pizza.findFirst({
      where: { id: pizzaId, pizzeriaId },
    });
    if (!pizza) throw new NotFoundException('Pizza not found');
    return pizza;
  }

  private async assertValidToppingIds(ids: string[]) {
    const unique = [...new Set(ids)];
    const found = await this.prisma.pizzaToppingOption.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException('Unknown topping');
    }
  }
}
