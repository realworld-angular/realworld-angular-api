import { Global, Module } from '@nestjs/common';
import { PhotonLocationService } from './photon-location.service';

@Global()
@Module({
  providers: [PhotonLocationService],
  exports: [PhotonLocationService],
})
export class PhotonModule {}
