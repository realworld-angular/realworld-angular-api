import { Global, Module } from '@nestjs/common';
import { NamesService } from './names.service';

@Global()
@Module({
  providers: [NamesService],
  exports: [NamesService],
})
export class NamesModule {}
