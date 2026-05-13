import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { OrderStatus } from '../common/enums';

export type OrderStatusEventPayload = {
  orderId: string;
  status: OrderStatus;
};

@Injectable()
export class OrderEventsService {
  private readonly events$ = new Subject<{
    userId: string;
    orderId: string;
    status: OrderStatus;
  }>();

  /** Push a status change to the customer's SSE stream (userId = order client). */
  emit(userId: string, payload: OrderStatusEventPayload): void {
    this.events$.next({ userId, ...payload });
  }

  streamForUser(userId: string): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((e) => e.userId === userId),
      map(
        (e): MessageEvent => ({
          data: JSON.stringify({ orderId: e.orderId, status: e.status }),
        }),
      ),
    );
  }

  streamForOrder(
    orderId: string,
  ): Observable<{ orderId: string; status: OrderStatus }> {
    return this.events$.pipe(
      filter((e) => e.orderId === orderId),
      map((e) => ({ orderId: e.orderId, status: e.status })),
    );
  }
}
