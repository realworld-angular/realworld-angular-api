import {
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressDto } from '../../common/dto/address.dto';

export class OrderItemDto {
  @ApiProperty({
    example: 'pizza-uuid-123',
    description: 'ID of the pizza to order',
  })
  @IsString()
  pizzaId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of this pizza',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 'size-option-uuid-1',
    description: 'ID of selected size option',
  })
  @IsOptional()
  @IsString()
  selectedSizeId?: string;

  @ApiProperty({
    example: ['topping-option-uuid-1', 'topping-option-uuid-2'],
    description: 'IDs of selected topping options',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds: string[];
}

export class CreateOrderDto {
  @ApiProperty({
    example: 'pizzeria-uuid-123',
    description: 'ID of the pizzeria to order from',
  })
  @IsString()
  pizzeriaId: string;

  @ApiProperty({
    type: AddressDto,
    example: { street: '123 Main St', city: 'Paris', country: 'France' },
  })
  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress: AddressDto;

  @ApiPropertyOptional({
    type: AddressDto,
    example: { street: '500 Billing St', city: 'Paris', country: 'France' },
    description: 'Billing address. Omit to bill to the delivery address.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional({ example: 'Please ring the doorbell', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @ApiProperty({
    type: [OrderItemDto],
    description: 'Items to include in this order',
  })
  @ApiPropertyOptional({
    example: 3.5,
    description: 'Optional tip amount to add to the order total',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @ApiPropertyOptional({
    example: '2026-06-01T14:00:00Z',
    description:
      'Scheduled delivery time (ISO 8601). Omit for ASAP delivery.',
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Optional coupon code for discount',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
