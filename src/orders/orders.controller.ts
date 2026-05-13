import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, concat, from, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { OrderEventsService } from '../order-events/order-events.service';
import { FEATURE_ACCESS_POLICY } from '../auth/feature-access.policy';

@ApiTags('Orders')
@ApiCookieAuth('access_token')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderEventsService: OrderEventsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.orders.create)
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.create(dto, user.id, user.role);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.orders.list)
  @ApiOperation({ summary: 'List orders for the current user' })
  @ApiQuery({ name: 'pizzeriaId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query('pizzeriaId') pizzeriaId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const orders = await this.ordersService.findAll(
      user.id,
      user.role,
      pizzeriaId,
    );
    const total = orders.length;
    const start = (Number(page) - 1) * Number(limit);
    const items = orders.slice(start, start + Number(limit));
    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    };
  }

  @Sse(':id/subscribe')
  @UseGuards(RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.orders.subscribe)
  @ApiOperation({
    summary: 'Subscribe to real-time status updates for a single order (SSE)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Server-Sent Events stream (text/event-stream); first message is the full order, subsequent messages are full order objects on each status change',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async subscribeToOrder(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ): Promise<Observable<MessageEvent>> {
    const initialOrder = await this.ordersService.findOne(
      id,
      user.id,
      user.role,
    );
    const initial$ = of<MessageEvent>({ data: JSON.stringify(initialOrder) });
    const updates$ = this.orderEventsService.streamForOrder(id).pipe(
      switchMap(() => from(this.ordersService.findOne(id, user.id, user.role))),
      map((order): MessageEvent => ({ data: JSON.stringify(order) })),
    );
    return concat(initial$, updates$);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.orders.read)
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.orders.cancel)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.cancel(id, user.id, user.role);
  }

  @Patch(':id/delivered')
  @UseGuards(RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.orders.markDelivered)
  @ApiOperation({ summary: 'Mark an order as delivered' })
  @ApiResponse({ status: 200, description: 'Order marked as delivered' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  markDelivered(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.markDelivered(id, user.id, user.role);
  }
}
