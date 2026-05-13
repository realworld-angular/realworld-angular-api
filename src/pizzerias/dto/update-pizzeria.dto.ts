import { IsString, MaxLength, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePizzeriaDto {
  @ApiPropertyOptional({ example: 'Rome', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 'Italy', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country?: string;

  @ApiPropertyOptional({
    example: 'pizzeria.jpg',
    description: 'Basename of a file under API `assets/images/pizzerias/`',
  })
  @IsOptional()
  @IsString()
  imageFilename?: string;
}
