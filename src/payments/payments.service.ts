import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Currency, PaymentMethod, StockLogType, ShiftStatus, PackageType } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) { }

  // 1. ບັນທຶກການຊຳລະເງິນ + ຕັດ Stock ພ້ອມ StockLog + ອັບເດດແພັກເກັດສະມາຊິກ + ເຊື່ອມໂຍງກະເງິນສົດ (Shift)
  async create(staffId: number, dto: CreatePaymentDto) {
    if (!staffId) {
      throw new BadRequestException('ບໍ່ພົບຂໍ້ມູນພະນັກງານ (staffId)');
    }

    return this.prisma.$transaction(async (tx) => {
      let member = null;
      let pkg = null;
      let product = null;

      // ກວດສອບສະມາຊິກ (ຖ້າມີການສົ່ງ memberId ມາ)
      if (dto.memberId) {
        member = await tx.member.findUnique({
          where: { id: dto.memberId },
        });
        if (!member) {
          throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສະມາຊິກນີ້');
        }
      }

      // ກວດສອບ Package (ຖ້າມີການສົ່ງ packageId ມາ)
      if (dto.packageId) {
        pkg = await tx.package.findUnique({
          where: { id: dto.packageId },
        });
        if (!pkg) {
          throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນແພັກເກັດນີ້');
        }
      }

      // ກວດສອບ Product ແລະ ເຊັກສະຕັອກ (ຖ້າມີການສົ່ງ productId ມາ)
      if (dto.productId) {
        product = await tx.product.findUnique({
          where: { id: dto.productId },
        });

        if (!product) {
          throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສິນຄ້ານີ້');
        }

        if (product.stock < 1) {
          throw new BadRequestException(`ສິນຄ້າ "${product.name}" ໝົດສະຕັອກແລ້ວ`);
        }
      }

      // ຄົ້ນຫາກະເງິນສົດທີ່ກຳລັງເປີດຢູ່ (ຖ້າບໍ່ໄດ້ລະບຸ shiftId ມາ)
      let targetShiftId = dto.shiftId || null;
      if (!targetShiftId) {
        const activeShift = await tx.shift.findFirst({
          where: { status: ShiftStatus.OPEN },
        });
        if (activeShift) {
          targetShiftId = activeShift.id;
        }
      }

      // ຄິດໄລ່ເງິນທອນອັດຕະໂນມັດ (Automatic Change Calculation)
      const paidCurrency = dto.paidCurrency || Currency.LAK;
      const exchangeRate = Number(dto.exchangeRate || 1);
      const amountPaid = Number(dto.amountPaid);
      const amountLak = Number(dto.amountLak);

      const equivalentPaidLak = paidCurrency === Currency.LAK ? amountPaid : amountPaid * exchangeRate;
      let changeLak = dto.changeLak !== undefined ? Number(dto.changeLak) : 0;

      if (!changeLak && equivalentPaidLak > amountLak) {
        changeLak = Math.max(0, equivalentPaidLak - amountLak);
      }

      // 1. ສ້າງ Record ການຊຳລະເງິນ
      const payment = await tx.payment.create({
        data: {
          staffId,
          shiftId: targetShiftId,
          memberId: dto.memberId || null,
          packageId: dto.packageId || null,
          productId: dto.productId || null,
          description: dto.description,
          amountLak: dto.amountLak,
          paidCurrency,
          exchangeRate,
          amountPaid: dto.amountPaid,
          changeLak,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
        },
        include: {
          staff: { select: { id: true, name: true } },
          member: { select: { id: true, fullName: true, code: true } },
          package: { select: { id: true, name: true, type: true } },
          product: { select: { id: true, name: true, priceLak: true, barcode: true } },
        },
      });

      // 2. ຖ້າມີການຊື້ Product -> ຕັດສະຕັອກສິນຄ້າ -1 ແລະ ສ້າງ StockLog (OUT_SALE)
      if (product) {
        const previousStock = product.stock;
        const newStock = previousStock - 1;

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: 1,
            },
          },
        });

        await tx.stockLog.create({
          data: {
            productId: product.id,
            staffId,
            type: StockLogType.OUT_SALE,
            quantity: -1,
            previousStock,
            newStock,
            unitCostLak: product.costPriceLak,
            totalCostLak: product.costPriceLak,
            reason: `POS Sale - Payment #${payment.id}`,
          },
        });
      }

      // 3. ຖ້າມີການຊື້ Package ໃຫ້ອັບເດດຂໍ້ມູນສະມາຊິກ + ສ້າງ MemberPackage
      if (member && pkg) {
        const updateMemberData: any = {
          packageId: pkg.id,
        };

        const now = new Date();
        let newExpireDate: Date | null = null;

        if (pkg.durationDays) {
          const baseDate = member.expireDate && member.expireDate > now ? member.expireDate : now;
          newExpireDate = new Date(baseDate);
          newExpireDate.setDate(newExpireDate.getDate() + pkg.durationDays);
          updateMemberData.expireDate = newExpireDate;
        } else if (pkg.durationHours) {
          newExpireDate = new Date(now.getTime() + pkg.durationHours * 60 * 60 * 1000);
          updateMemberData.expireDate = newExpireDate;
        }

        const sessionsToAdd = pkg.sessions ?? (pkg.type === PackageType.DAY_PASS ? 1 : 0);
        if (sessionsToAdd > 0) {
          const currentSessions = member.remainingSessions && member.remainingSessions > 0 ? member.remainingSessions : 0;
          updateMemberData.remainingSessions = currentSessions + sessionsToAdd;
        }

        await tx.member.update({
          where: { id: member.id },
          data: updateMemberData,
        });

        // ສ້າງ MemberPackage ສຳລັບຮອງຮັບ PT Hours ແລະ Multi-package history
        await tx.memberPackage.create({
          data: {
            memberId: member.id,
            packageId: pkg.id,
            startDate: now,
            expireDate: newExpireDate,
            totalSessions: pkg.sessions || 0,
            remainingSessions: pkg.sessions || 0,
            totalPtHours: pkg.ptHours || 0,
            remainingPtHours: pkg.ptHours || 0,
            isActive: true,
          },
        });
      }

      return payment;
    });
  }

  // 2. ດຶງປະວັດການຊຳລະເງິນທັງໝົດ
  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        staff: { select: { id: true, name: true } },
        member: { select: { id: true, fullName: true, code: true } },
        package: { select: { id: true, name: true, type: true } },
        product: { select: { id: true, name: true, priceLak: true, barcode: true } },
        shift: { select: { id: true, status: true, openedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. ດຶງໃບບິນຕາມ ID
  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true } },
        member: { select: { id: true, fullName: true, code: true } },
        package: { select: { id: true, name: true, type: true } },
        product: { select: { id: true, name: true, priceLak: true, barcode: true } },
        shift: { select: { id: true, status: true, openedAt: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('ບໍ່ພົບໃບບິນຊຳລະເງິນນີ້');
    }

    return payment;
  }

  // 4. ດຶງຍອດລາຍຮັບລວມທັງໝົດ
  async getTotalRevenue() {
    const result = await this.prisma.payment.aggregate({
      _sum: {
        amountLak: true,
      },
    });

    return {
      totalRevenue: result._sum.amountLak || 0,
    };
  }
}