import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Currency, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) { }

  // 1. ບັນທຶກການຊຳລະເງິນ + ອັບເດດ Package ສະມາຊິກອັດໂນມັດ
  async create(staffId: number, dto: CreatePaymentDto) {
    if (!staffId) {
      throw new BadRequestException('ບໍ່ພົບຂໍ້ມູນພະນັກງານ (staffId)');
    }
    return this.prisma.$transaction(async (tx) => {
      let member = null;
      let pkg = null;

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

      // 1. ສ້າງ Record ການຊຳລະເງິນ
      const payment = await tx.payment.create({
        data: {
          staffId,
          memberId: dto.memberId || null,
          description: dto.description,
          amountLak: dto.amountLak,
          paidCurrency: dto.paidCurrency || Currency.LAK,
          exchangeRate: dto.exchangeRate || 1,
          amountPaid: dto.amountPaid,
          changeLak: dto.changeLak || 0,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
        },
        include: {
          staff: { select: { id: true, name: true } },
          member: { select: { id: true, fullName: true, code: true } },
        },
      });

      // 2. ຖ້າມີການຊື້ Package ໃຫ້ອັບເດດຂໍ້ມູນສະມາຊິກ
      if (member && pkg) {
        const updateMemberData: any = {
          packageId: pkg.id,
        };

        const now = new Date();

        // ຖ້າເປັນແພັກເກັດກຳນົດວັນ (durationDays) -> ຄິດໄລ່ອາຍຸໃໝ່
        if (pkg.durationDays) {
          // ຖ້າອາຍຸເກົ່າຍັງບໍ່ໝົດ ໃຫ້ຕໍ່ຈາກອາຍຸເກົ່າ. ຖ້າໝົດແລ້ວ ໃຫ້ເລີ່ມນັບຈາກມື້ນີ້
          const baseDate = member.expireDate && member.expireDate > now ? member.expireDate : now;
          const newExpireDate = new Date(baseDate);
          newExpireDate.setDate(newExpireDate.getDate() + pkg.durationDays);

          updateMemberData.expireDate = newExpireDate;
        }

        // ຖ້າເປັນແພັກເກັດ (sessions ຫຼື durationDays) -> ບວກຈຳນວນຄັ້ງເພີ່ມ (รายวัน = 1, รายเดือน = 30, รายปี = 365, หรือตาม sessions)
        const sessionsToAdd = pkg.sessions ?? pkg.durationDays ?? 0;
        if (sessionsToAdd > 0) {
          const currentSessions = member.remainingSessions && member.remainingSessions > 0 ? member.remainingSessions : 0;
          updateMemberData.remainingSessions = currentSessions + sessionsToAdd;
        }

        await tx.member.update({
          where: { id: member.id },
          data: updateMemberData,
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
      },
    });

    if (!payment) {
      throw new NotFoundException('ບໍ່ພົບໃບບິນຊຳລະເງິນນີ້');
    }

    return payment;
  }
}