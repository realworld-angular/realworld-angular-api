import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Role, OrderStatus } from '../common/enums';
import { OrderEventsService } from '../order-events/order-events.service';
import type { Address } from '../common/dto/address.dto';
import { PhotonLocationService } from '../photon/photon-location.service';

const ORDER_SELECT = {
  id: true,
  deliveryStreetAddress: true,
  deliveryCity: true,
  deliveryCountry: true,
  billingStreetAddress: true,
  billingCity: true,
  billingCountry: true,
  notes: true,
  status: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  pizzeria: { select: { id: true, name: true, city: true, country: true } },
  client: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      selectedOptions: true,
      pizza: { select: { id: true, name: true } },
    },
  },
};

const ADMIN_ORDER_LIST_SELECT = {
  id: true,
  status: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  pizzeria: { select: { id: true, name: true, city: true, country: true } },
  client: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      selectedOptions: true,
      pizza: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderEvents: OrderEventsService,
    private readonly photon: PhotonLocationService,
  ) {}

  private normalizeOrderAddressInput(a: Address): Address {
    return {
      street: a.street.trim(),
      city: a.city.trim(),
      country: a.country.trim(),
    };
  }

  private assertCompleteOrderAddress(label: string, a: Address): void {
    const n = this.normalizeOrderAddressInput(a);
    if (!n.street || !n.city || !n.country) {
      throw new BadRequestException(
        `${label} must include street, city, and country (use the location picker values for city and country).`,
      );
    }
  }

  private addressesEqual(a: Address, b: Address): boolean {
    const x = this.normalizeOrderAddressInput(a);
    const y = this.normalizeOrderAddressInput(b);
    return (
      x.street === y.street && x.city === y.city && x.country === y.country
    );
  }

  private mapOrderRow<
    T extends {
      deliveryStreetAddress: string;
      deliveryCity: string;
      deliveryCountry: string;
      billingStreetAddress: string | null;
      billingCity: string | null;
      billingCountry: string | null;
    },
  >(
    row: T,
  ): Omit<
    T,
    | 'deliveryStreetAddress'
    | 'deliveryCity'
    | 'deliveryCountry'
    | 'billingStreetAddress'
    | 'billingCity'
    | 'billingCountry'
  > & {
    deliveryAddress: Address;
    billingAddress: Address | null;
  } {
    const billing =
      row.billingStreetAddress != null &&
      row.billingCity != null &&
      row.billingCountry != null
        ? {
            street: row.billingStreetAddress,
            city: row.billingCity,
            country: row.billingCountry,
          }
        : null;
    const {
      deliveryStreetAddress,
      deliveryCity,
      deliveryCountry,
      billingStreetAddress: _bs,
      billingCity: _bc,
      billingCountry: _bco,
      ...rest
    } = row;
    return {
      ...rest,
      deliveryAddress: {
        street: deliveryStreetAddress,
        city: deliveryCity,
        country: deliveryCountry,
      },
      billingAddress: billing,
    };
  }

  async create(dto: CreateOrderDto, clientId: string, role: Role) {
    if (role !== Role.CUSTOMER) {
      throw new ForbiddenException('Only customers may place orders');
    }

    this.assertCompleteOrderAddress('Delivery address', dto.deliveryAddress);
    const deliveryNorm = this.normalizeOrderAddressInput(dto.deliveryAddress);
    await this.photon.verifyCityCountry(
      deliveryNorm.city,
      deliveryNorm.country,
    );

    let billingStreet: string | null = null;
    let billingCity: string | null = null;
    let billingCountry: string | null = null;
    if (dto.billingAddress) {
      this.assertCompleteOrderAddress('Billing address', dto.billingAddress);
      const billingNorm = this.normalizeOrderAddressInput(dto.billingAddress);
      await this.photon.verifyCityCountry(
        billingNorm.city,
        billingNorm.country,
      );
      if (!this.addressesEqual(deliveryNorm, billingNorm)) {
        billingStreet = billingNorm.street;
        billingCity = billingNorm.city;
        billingCountry = billingNorm.country;
      }
    }

    // Validate all pizzas belong to the pizzeria
    const pizzaIds = dto.items.map((i) => i.pizzaId);
    const pizzas = await this.prisma.pizza.findMany({
      where: {
        id: { in: pizzaIds },
        pizzeriaId: dto.pizzeriaId,
      },
      select: { id: true, basePrice: true },
    });

    if (pizzas.length !== pizzaIds.length) {
      throw new BadRequestException(
        'One or more pizzas are not from this pizzeria',
      );
    }

    const [sizeOptions, toppingOptions] = await Promise.all([
      this.prisma.pizzaSizeOption.findMany({
        select: { id: true, label: true, price: true },
      }),
      this.prisma.pizzaToppingOption.findMany({
        select: { id: true, label: true, price: true },
      }),
    ]);
    const sizeById = new Map(sizeOptions.map((option) => [option.id, option]));
    const toppingById = new Map(
      toppingOptions.map((option) => [option.id, option]),
    );

    // Calculate total
    let total = 0;
    const itemsData = dto.items.map((item) => {
      const pizza = pizzas.find((p) => p.id === item.pizzaId)!;
      const selectedOptions: Array<{
        id: string;
        type: 'SIZE' | 'TOPPING';
        label: string;
        price: number;
      }> = [];

      if (item.selectedSizeId) {
        const selectedSize = sizeById.get(item.selectedSizeId);
        if (!selectedSize) {
          throw new BadRequestException(
            `Invalid size option selected for pizza ${item.pizzaId}`,
          );
        }
        selectedOptions.push({
          id: selectedSize.id,
          type: 'SIZE',
          label: selectedSize.label,
          price: Number(selectedSize.price),
        });
      }

      const uniqueToppingIds = [...new Set(item.selectedOptionIds ?? [])];
      for (const toppingId of uniqueToppingIds) {
        const topping = toppingById.get(toppingId);
        if (!topping) {
          throw new BadRequestException(
            `Invalid topping option selected for pizza ${item.pizzaId}`,
          );
        }
        selectedOptions.push({
          id: topping.id,
          type: 'TOPPING',
          label: topping.label,
          price: Number(topping.price),
        });
      }

      const optionTotal = selectedOptions.reduce((sum, o) => sum + o.price, 0);
      const unitPrice = Number(pizza.basePrice) + optionTotal;
      total += unitPrice * item.quantity;

      return {
        pizzaId: item.pizzaId,
        quantity: item.quantity,
        unitPrice,
        selectedOptions,
      };
    });

    const created = await this.prisma.order.create({
      data: {
        clientId,
        pizzeriaId: dto.pizzeriaId,
        deliveryStreetAddress: deliveryNorm.street,
        deliveryCity: deliveryNorm.city,
        deliveryCountry: deliveryNorm.country,
        billingStreetAddress: billingStreet,
        billingCity: billingCity,
        billingCountry: billingCountry,
        notes: dto.notes,
        total,
        items: { create: itemsData },
      },
      select: ORDER_SELECT,
    });
    this.orderEvents.emit(clientId, {
      orderId: created.id,
      status: created.status as OrderStatus,
    });
    return this.mapOrderRow(created);
  }

  async findAll(userId: string, role: Role, pizzeriaId?: string) {
    if (role === Role.CUSTOMER) {
      const orders = await this.prisma.order.findMany({
        where: { clientId: userId },
        select: ORDER_SELECT,
        orderBy: { createdAt: 'desc' },
      });
      return orders.map((o) => this.mapOrderRow(o));
    }

    if (role === Role.PIZZERIA_ADMIN) {
      return this.prisma.order.findMany({
        where: {
          pizzeria: { ownerId: userId },
          ...(pizzeriaId ? { pizzeriaId } : {}),
        },
        select: ADMIN_ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    return [];
  }

  async findOne(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        ...ORDER_SELECT,
        pizzeria: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            ownerId: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.client.id === userId;
    // PIZZERIA_ADMIN may only read orders belonging to their own pizzerias
    const isPizzeriaAdmin =
      role === Role.PIZZERIA_ADMIN &&
      (order.pizzeria as { ownerId: string }).ownerId === userId;

    if (!isOwner && !isPizzeriaAdmin) throw new ForbiddenException();

    // Strip internal ownerId from the response
    const { pizzeria, ...rest } = order;
    const mapped = this.mapOrderRow(rest);
    return {
      ...mapped,
      pizzeria: {
        id: pizzeria.id,
        name: pizzeria.name,
        city: pizzeria.city,
        country: pizzeria.country,
      },
    };
  }

  async cancel(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { pizzeria: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOrderCustomer = order.clientId === userId && role === Role.CUSTOMER;
    const isAdmin =
      role === Role.PIZZERIA_ADMIN && order.pizzeria.ownerId === userId;

    if (!isOrderCustomer && !isAdmin) throw new ForbiddenException();
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only PENDING orders can be cancelled');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      select: ORDER_SELECT,
    });
    this.orderEvents.emit(order.clientId, {
      orderId,
      status: OrderStatus.CANCELLED,
    });
    return this.mapOrderRow(updated);
  }

  async markDelivered(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { pizzeria: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isAdmin =
      role === Role.PIZZERIA_ADMIN && order.pizzeria.ownerId === userId;

    if (!isAdmin) throw new ForbiddenException();
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Only active orders can be marked as delivered',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
      select: ORDER_SELECT,
    });
    this.orderEvents.emit(order.clientId, {
      orderId,
      status: OrderStatus.DELIVERED,
    });
    return this.mapOrderRow(updated);
  }
}
