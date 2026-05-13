import {
  IsString,
  IsNumber,
  Min,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePizzaDto {
  // name is server-generated

  @ApiProperty({
    example: 12.5,
    description: 'Base price in currency units',
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    example: 'pizza.jpg',
    description: 'Basename of a file under API `assets/images/pizzas/`',
  })
  @IsString()
  imageFilename: string;

  @ApiProperty({
    type: [String],
    example: ['cm123abc'],
    description: 'IDs of PizzaToppingOption rows (at least one required)',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one topping' })
  @IsString({ each: true })
  toppingIds: string[];
}
