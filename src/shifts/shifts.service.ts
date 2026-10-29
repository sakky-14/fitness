import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ShiftStatus, PaymentMethod, Currency } from '@prisma/client';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) { }

  // 1. ເປີດກະໃໝ່ (Open Shift)
  async openShift(staffId: number, dto: OpenShiftDto) {
    if (!staffId) {
      throw new BadRequestException('ບໍ່ພົບຂໍ້ມູນພະນັກງານທີ່ເປີດກະ (staffId)');
    }

    // ກວດສອບວ່າມີກະທີ່ກຳລັງເປີດຄາໄວ້ຢູ່ຫຼືບໍ່
    const existingOpenShift = await this.prisma.shift.findFirst({
      where: {
        status: ShiftStatus.OPEN,
      },
      include: { openedBy: { select: { id: true, name: true, phone: true } } },
    });

    if (existingOpenShift) {
      throw new BadRequestException(
        `ມີກະທີ່ກຳລັງເປີດໃຊ້ງານຢູ່ແລ້ວ (Shift ID: #${existingOpenShift.id} ໂດຍ ${existingOpenShift.openedBy.name}). ກະລຸນາປິດກະເກົ່າກ່ອນ`,
      );
    }

    return this.prisma.shift.create({
      data: {
        openedById: staffId,
        startCashLak: dto.startCashLak,
        startCashThb: dto.startCashThb || 0,
        startCashUsd: dto.startCashUsd || 0,
        status: ShiftStatus.OPEN,
        notes: dto.notes,
      },
      include: {
        openedBy: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  // 2. ດຶງກະທີ່ກຳລັງເປີດຢູ່ປັດຈຸບັນ (Current Open Shift)
  async getCurrentShift() {
    const shift = await this.prisma.shift.findFirst({
      where: { status: ShiftStatus.OPEN },
      include: {
        openedBy: { select: { id: true, name: true, phone: true } },
        payments: {
          select: {
            id: true,
            amountLak: true,
            paidCurrency: true,
            amountPaid: true,
            changeLak: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shift) {
      return {
        hasOpenShift: false,
        shift: null,
      };
    }

    // ຄິດໄລ່ຍອດເງິນສົດທີ່ໄດ້ຮັບໃນກະນີ້ແບບ Real-time
    let cashSalesLak = 0;
    let cashSalesThb = 0;
    let cashSalesUsd = 0;
    let totalChangeGivenLak = 0;

    for (const p of shift.payments) {
      if (p.paymentMethod === PaymentMethod.CASH) {
        if (p.paidCurrency === Currency.LAK) cashSalesLak += Number(p.amountPaid);
        if (p.paidCurrency === Currency.THB) cashSalesThb += Number(p.amountPaid);
        if (p.paidCurrency === Currency.USD) cashSalesUsd += Number(p.amountPaid);
        totalChangeGivenLak += Number(p.changeLak || 0);
      }
    }

    const expectedCashLak = Number(shift.startCashLak) + cashSalesLak - totalChangeGivenLak;
    const expectedCashThb = Number(shift.startCashThb) + cashSalesThb;
    const expectedCashUsd = Number(shift.startCashUsd) + cashSalesUsd;

    return {
      hasOpenShift: true,
      shift,
      realTimeSummary: {
        startCashLak: Number(shift.startCashLak),
        cashSalesLak,
        totalChangeGivenLak,
        expectedCashLak,
        expectedCashThb,
        expectedCashUsd,
        totalTransactions: shift.payments.length,
      },
    };
  }

  // 3. ປິດກະ (Close Shift)
  async closeShift(shiftId: number, staffId: number, dto: CloseShiftDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        payments: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນກະນີ້');
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('ກະນີ້ຖືກປິດໄປແລ້ວ');
    }

    // ຄິດໄລ່ຍອດເງິນສົດທີ່ຄາດວ່າຈະມີ
    let cashSalesLak = 0;
    let cashSalesThb = 0;
    let cashSalesUsd = 0;
    let totalChangeGivenLak = 0;

    for (const p of shift.payments) {
      if (p.paymentMethod === PaymentMethod.CASH) {
        if (p.paidCurrency === Currency.LAK) cashSalesLak += Number(p.amountPaid);
        if (p.paidCurrency === Currency.THB) cashSalesThb += Number(p.amountPaid);
        if (p.paidCurrency === Currency.USD) cashSalesUsd += Number(p.amountPaid);
        totalChangeGivenLak += Number(p.changeLak || 0);
      }
    }

    const expectedCashLak = Number(shift.startCashLak) + cashSalesLak - totalChangeGivenLak;
    const expectedCashThb = Number(shift.startCashThb) + cashSalesThb;
    const expectedCashUsd = Number(shift.startCashUsd) + cashSalesUsd;
    const differenceLak = dto.actualCashLak - expectedCashLak;

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        closedById: staffId,
        closedAt: new Date(),
        actualCashLak: dto.actualCashLak,
        actualCashThb: dto.actualCashThb || 0,
        actualCashUsd: dto.actualCashUsd || 0,
        expectedCashLak,
        expectedCashThb,
        expectedCashUsd,
        differenceLak,
        status: ShiftStatus.CLOSED,
        notes: dto.notes,
      },
      include: {
        openedBy: { select: { id: true, name: true, phone: true } },
        closedBy: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  // 4. ດຶງປະຫວັດການເປີດ-ປິດກະທັງໝົດ
  async findAll(status?: ShiftStatus) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.shift.findMany({
      where,
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  // 5. ດຶງລາຍລະອຽດກະຕາມ ID
  async findOne(id: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        openedBy: { select: { id: true, name: true, phone: true } },
        closedBy: { select: { id: true, name: true, phone: true } },
        payments: {
          include: {
            member: { select: { id: true, fullName: true, code: true } },
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນກະນີ້');
    }

    return shift;
  }
}
