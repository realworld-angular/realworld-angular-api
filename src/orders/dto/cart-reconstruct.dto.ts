import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CartReconstructItemDto {
  @ApiProperty({ example: 'pizza-uuid-123' })
  @IsString()
  pizzaId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'size-option-uuid-1', required: false })
  @IsOptional()
  @IsString()
  selectedSizeId?: string;

  @ApiProperty({ example: ['topping-option-uuid-1'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds: string[];
}

export class CartReconstructDto {
  @ApiProperty({ example: 'pizzeria-uuid-123' })
  @IsString()
  pizzeriaId: string;

  @ApiProperty({ type: [CartReconstructItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartReconstructItemDto)
  items: CartReconstructItemDto[];
}
