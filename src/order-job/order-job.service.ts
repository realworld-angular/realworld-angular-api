import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../common/enums';
import { OrderEventsService } from '../order-events/order-events.service';

@Injectable()
export class OrderJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderJobService.name);
  private timer: NodeJS.Timeout | null = null;

  private readonly pendingToPreparingMs = parseInt(
    process.env.ORDER_PENDING_TO_PREPARING_MS ?? '120000',
  );
  private readonly preparingToReadyMs = parseInt(
    process.env.ORDER_PREPARING_TO_READY_MS ?? '300000',
  );
  private readonly readyToDeliveredMs = parseInt(
    process.env.ORDER_READY_TO_DELIVERED_MS ?? '180000',
  );
  private readonly intervalMs = parseInt(
    process.env.ORDER_JOB_INTERVAL_MS ?? '30000',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderEvents: OrderEventsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processOrders(), this.intervalMs);
    this.logger.log(
      `Order lifecycle job started (interval: ${this.intervalMs}ms)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async processOrders() {
    const now = new Date();

    try {
      await this.transitionOrders(
        OrderStatus.PENDING,
        OrderStatus.PREPARING,
        this.pendingToPreparingMs,
        now,
      );
      await this.transitionOrders(
        OrderStatus.PREPARING,
        OrderStatus.READY,
        this.preparingToReadyMs,
        now,
      );
      await this.transitionOrders(
        OrderStatus.READY,
        OrderStatus.DELIVERED,
        this.readyToDeliveredMs,
        now,
      );
    } catch (err) {
      this.logger.error('Order job error', err);
    }
  }

  private async transitionOrders(
    from: OrderStatus,
    to: OrderStatus,
    minAgeMs: number,
    now: Date,
  ) {
    const cutoff = new Date(now.getTime() - minAgeMs);
    const rows = await this.prisma.order.findMany({
      where: {
        status: from,
        updatedAt: { lte: cutoff },
      },
      select: { id: true, clientId: true },
    });

    for (const row of rows) {
      await this.prisma.order.update({
        where: { id: row.id },
        data: { status: to },
      });
      this.orderEvents.emit(row.clientId, { orderId: row.id, status: to });
    }
  }
}
