import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Coupons')
@ApiCookieAuth('access_token')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate a coupon code for the current user' })
  async validate(
    @Param('code') code: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.couponsService.validate(code, user.id);
  }
}
