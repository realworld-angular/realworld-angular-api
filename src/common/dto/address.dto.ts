import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export interface Address {
  street: string;
  city: string;
  country: string;
}

export class AddressDto implements Address {
  @ApiProperty({ example: '12 Basil Lane', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  street: string;

  @ApiProperty({ example: 'Naples', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  city: string;

  @ApiProperty({ example: 'Italy', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  country: string;
}
