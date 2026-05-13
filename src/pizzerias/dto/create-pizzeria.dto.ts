import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePizzeriaDto {
  // name is intentionally absent — generated server-side

  @ApiProperty({ example: 'Naples', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city: string;

  @ApiProperty({ example: 'Italy', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country: string;

  @ApiProperty({
    example: 'pizzeria.jpg',
    description: 'Basename of a file under API `assets/images/pizzerias/`',
  })
  @IsString()
  imageFilename: string;
}
