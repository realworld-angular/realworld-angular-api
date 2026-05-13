import { Module } from '@nestjs/common';
import { PizzeriasService } from './pizzerias.service';
import { PizzeriasController } from './pizzerias.controller';

@Module({
  providers: [PizzeriasService],
  controllers: [PizzeriasController],
  exports: [PizzeriasService],
})
export class PizzeriasModule {}
