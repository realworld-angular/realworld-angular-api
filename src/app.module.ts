import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { NamesModule } from './names/names.module';
import { AuthModule } from './auth/auth.module';
import { PizzeriasModule } from './pizzerias/pizzerias.module';
import { PizzasModule } from './pizzas/pizzas.module';
import { OrdersModule } from './orders/orders.module';
import { OrderEventsModule } from './order-events/order-events.module';
import { OrderJobModule } from './order-job/order-job.module';
import { PhotonModule } from './photon/photon.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PhotonModule,
    NamesModule,
    AuthModule,
    PizzeriasModule,
    PizzasModule,
    OrderEventsModule,
    OrdersModule,
    OrderJobModule,
  ],
})
export class AppModule {}
