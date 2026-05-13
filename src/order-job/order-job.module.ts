import { Module } from '@nestjs/common';
import { OrderJobService } from './order-job.service';

@Module({
  providers: [OrderJobService],
})
export class OrderJobModule {}
