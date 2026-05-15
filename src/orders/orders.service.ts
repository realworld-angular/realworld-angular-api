import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CartReconstructDto } from './dto/cart-reconstruct.dto';
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
      pizza: { select: { id: true, name: true, basePrice: true } },
      size: { select: { id: true, label: true, price: true } },
      toppings: {
        select: {
          topping: { select: { id: true, label: true, price: true } },
        },
      },
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
      pizza: { select: { id: true, name: true, basePrice: true } },
      size: { select: { id: true, label: true, price: true } },
      toppings: {
        select: {
          topping: { select: { id: true, label: true, price: true } },
        },
      },
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

  private mapOrderItem(item: {
    id: string;
    quantity: number;
    pizza: { id: string; name: string; basePrice: number };
    size: { id: string; label: string; price: number } | null;
    toppings: { topping: { id: string; label: string; price: number } }[];
  }) {
    const sizePrice = item.size ? Number(item.size.price) : 0;
    const toppingsPrice = item.toppings.reduce(
      (sum: number, t) => sum + Number(t.topping.price),
      0,
    );
    const unitPrice = Number(item.pizza.basePrice) + sizePrice + toppingsPrice;

    const selectedOptions: Array<{
      id: string;
      type: 'SIZE' | 'TOPPING';
      label: string;
      price: number;
    }> = [];

    if (item.size) {
      selectedOptions.push({
        id: item.size.id,
        type: 'SIZE',
        label: item.size.label,
        price: Number(item.size.price),
      });
    }

    for (const t of item.toppings) {
      selectedOptions.push({
        id: t.topping.id,
        type: 'TOPPING',
        label: t.topping.label,
        price: Number(t.topping.price),
      });
    }

    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice,
      selectedOptions,
      pizza: { id: item.pizza.id, name: item.pizza.name },
    };
  }

  async reconstructCart(dto: CartReconstructDto) {
    const pizzeria = await this.prisma.pizzeria.findUnique({
      where: { id: dto.pizzeriaId },
      select: { id: true, name: true, imageFilename: true },
    });
    if (!pizzeria) throw new NotFoundException('Pizzeria not found');

    const pizzaIds = [...new Set(dto.items.map((i) => i.pizzaId))];
    const pizzas = await this.prisma.pizza.findMany({
      where: { id: { in: pizzaIds } },
      select: { id: true, name: true, basePrice: true, imageFilename: true },
    });
    const pizzaMap = new Map(pizzas.map((p) => [p.id, p]));

    const [sizeOptions, toppingOptions] = await Promise.all([
      this.prisma.pizzaSizeOption.findMany({
        select: { id: true, label: true, price: true },
      }),
      this.prisma.pizzaToppingOption.findMany({
        select: { id: true, label: true, price: true },
      }),
    ]);
    const sizeMap = new Map(sizeOptions.map((s) => [s.id, s]));
    const toppingMap = new Map(toppingOptions.map((t) => [t.id, t]));

    const items = dto.items.map((item) => {
      const pizza = pizzaMap.get(item.pizzaId);
      if (!pizza) {
        throw new BadRequestException(`Pizza not found: ${item.pizzaId}`);
      }

      const size = item.selectedSizeId ? (sizeMap.get(item.selectedSizeId) ?? null) : null;
      if (item.selectedSizeId && !size) {
        throw new BadRequestException(`Size option not found: ${item.selectedSizeId}`);
      }

      const uniqueToppingIds = [...new Set(item.selectedOptionIds ?? [])];
      const extraToppings = uniqueToppingIds
        .map((id) => toppingMap.get(id))
        .filter((t): t is NonNullable<typeof t> => t != null);
      if (extraToppings.length !== uniqueToppingIds.length) {
        throw new BadRequestException('One or more topping options not found');
      }

      const sizePrice = size ? Number(size.price) : 0;
      const toppingsPrice = extraToppings.reduce((sum, t) => sum + Number(t.price), 0);
      const totalPrice = (Number(pizza.basePrice) + sizePrice + toppingsPrice) * item.quantity;

      const compositeId = `${item.pizzaId}:${item.selectedSizeId ?? ''}:${uniqueToppingIds.sort().join(',')}`;

      return {
        id: compositeId,
        pizza: {
          id: pizza.id,
          name: pizza.name,
          image: pizza.imageFilename,
          basePrice: pizza.basePrice,
        },
        quantity: item.quantity,
        size: size
          ? { id: size.id, label: size.label, price: Number(size.price) }
          : null,
        extraToppings: extraToppings.map((t) => ({
          id: t.id,
          label: t.label,
          price: Number(t.price),
        })),
        totalPrice,
      };
    });

    return {
      pizzeria: {
        id: pizzeria.id,
        name: pizzeria.name,
        image: pizzeria.imageFilename,
      },
      items,
      total: items.reduce((sum, item) => sum + item.totalPrice, 0),
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
      this.prisma.pizzaSizeOption.findMany({ select: { id: true, price: true } }),
      this.prisma.pizzaToppingOption.findMany({ select: { id: true, price: true } }),
    ]);
    const sizeById = new Map(sizeOptions.map((s) => [s.id, Number(s.price)]));
    const toppingById = new Map(toppingOptions.map((t) => [t.id, Number(t.price)]));

    let total = 0;
    const itemsData = dto.items.map((item) => {
      const pizza = pizzas.find((p) => p.id === item.pizzaId)!;

      let sizePrice = 0;
      if (item.selectedSizeId) {
        const price = sizeById.get(item.selectedSizeId);
        if (price === undefined) {
          throw new BadRequestException(
            `Invalid size option selected for pizza ${item.pizzaId}`,
          );
        }
        sizePrice = price;
      }

      const uniqueToppingIds = [...new Set(item.selectedOptionIds ?? [])];
      let toppingsPrice = 0;
      for (const toppingId of uniqueToppingIds) {
        const price = toppingById.get(toppingId);
        if (price === undefined) {
          throw new BadRequestException(
            `Invalid topping option selected for pizza ${item.pizzaId}`,
          );
        }
        toppingsPrice += price;
      }
      const itemTotal =
        (Number(pizza.basePrice) + sizePrice + toppingsPrice) * item.quantity;
      total += itemTotal;

      return {
        pizzaId: item.pizzaId,
        quantity: item.quantity,
        selectedSizeId: item.selectedSizeId ?? null,
        uniqueToppingIds,
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
        items: {
          create: itemsData.map((item) => ({
            pizzaId: item.pizzaId,
            quantity: item.quantity,
            selectedSizeId: item.selectedSizeId,
            toppings: {
              create: item.uniqueToppingIds.map((toppingId) => ({
                toppingId,
              })),
            },
          })),
        },
      },
      select: ORDER_SELECT,
    });

    const items = created.items.map((item) => this.mapOrderItem(item));
    this.orderEvents.emit(clientId, {
      orderId: created.id,
      status: created.status as OrderStatus,
    });
    return { ...this.mapOrderRow(created), items };
  }

  async findAll(userId: string, role: Role, pizzeriaId?: string) {
    if (role === Role.CUSTOMER) {
      const orders = await this.prisma.order.findMany({
        where: { clientId: userId },
        select: ORDER_SELECT,
        orderBy: { createdAt: 'desc' },
      });
      return orders.map((o) => ({
        ...this.mapOrderRow(o),
        items: o.items.map((item) => this.mapOrderItem(item)),
      }));
    }

    if (role === Role.PIZZERIA_ADMIN) {
      const orders = await this.prisma.order.findMany({
        where: {
          pizzeria: { ownerId: userId },
          ...(pizzeriaId ? { pizzeriaId } : {}),
        },
        select: ADMIN_ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
      });
      return orders.map((o) => ({
        ...o,
        items: o.items.map((item) => this.mapOrderItem(item)),
      }));
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
    const isPizzeriaAdmin =
      role === Role.PIZZERIA_ADMIN &&
      (order.pizzeria as { ownerId: string }).ownerId === userId;

    if (!isOwner && !isPizzeriaAdmin) throw new ForbiddenException();

    const { pizzeria, ...rest } = order;
    const mapped = this.mapOrderRow(rest);
    return {
      ...mapped,
      items: order.items.map((item) => this.mapOrderItem(item)),
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
    return {
      ...this.mapOrderRow(updated),
      items: updated.items.map((item) => this.mapOrderItem(item)),
    };
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
    return {
      ...this.mapOrderRow(updated),
      items: updated.items.map((item) => this.mapOrderItem(item)),
    };
  }
}
