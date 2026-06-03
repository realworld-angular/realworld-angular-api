import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, userId: string) {
    const coupon = await this.prisma.couponCode.findUnique({
      where: { code },
    });

    if (!coupon) {
      return { valid: false, message: 'Coupon code not found', discountPercent: 0 };
    }

    const usage = await this.prisma.couponUsage.findUnique({
      where: {
        couponCodeId_userId: {
          couponCodeId: coupon.id,
          userId,
        },
      },
    });

    if (usage) {
      return { valid: false, message: 'This coupon has already been used', discountPercent: 0 };
    }

    return { valid: true, message: 'Coupon applied', discountPercent: coupon.discountPercent };
  }

  async markUsed(codeId: string, userId: string, orderId: string) {
    await this.prisma.couponUsage.create({
      data: {
        couponCodeId: codeId,
        userId,
        orderId,
      },
    });
  }

  async resolveCode(code: string) {
    const coupon = await this.prisma.couponCode.findUnique({
      where: { code },
    });
    return coupon;
  }
}
