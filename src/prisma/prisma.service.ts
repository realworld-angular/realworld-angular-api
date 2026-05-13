import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private client: PrismaClient;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async onModuleInit() {
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
    await this.client.$connect();
  }

  async onModuleDestroy() {
    if (this.client) await this.client.$disconnect();
    await this.pool.end();
  }

  // Proxy all Prisma model accessors
  get user() {
    return this.client.user;
  }

  get pizzeria() {
    return this.client.pizzeria;
  }

  get pizzeriaStaff() {
    return this.client.pizzeriaStaff;
  }

  get pizza() {
    return this.client.pizza;
  }

  get pizzaSizeOption() {
    return this.client.pizzaSizeOption;
  }

  get order() {
    return this.client.order;
  }

  get orderItem() {
    return this.client.orderItem;
  }

  get pizzaToppingOption() {
    return this.client.pizzaToppingOption;
  }

  $disconnect() {
    return this.client.$disconnect();
  }

  $transaction(args: any) {
    return this.client.$transaction(args);
  }
}
