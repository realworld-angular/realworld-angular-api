import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePizzaDto {
  @ApiPropertyOptional({ example: 14.99, description: 'New base price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({
    example: 'pizza.jpg',
    description: 'Basename of a file under API `assets/images/pizzas/`',
  })
  @IsOptional()
  @IsString()
  imageFilename?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Replace pizza toppings (at least one when provided)',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one topping' })
  @IsString({ each: true })
  toppingIds?: string[];
}
