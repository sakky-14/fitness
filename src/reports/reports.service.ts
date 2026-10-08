import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetReportFilterDto } from './dto/get-report-filter.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  // 1. ສະຫຼຸບລາຍງານການເງິນ (ກຳໄລ-ຂາດທຶນ, ລາຍຮັບ, ລາຍຈ່າຍ)
  async getFinancialReport(filter: GetReportFilterDto) {
    const { startDate, endDate } = this.getDateRange(filter);

    const whereDateRange = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // ດຶງຍອດລວມລາຍຮັບ (Payments)
    const incomeAggregate = await this.prisma.payment.aggregate({
      _sum: { amountLak: true },
      _count: { id: true },
      where: whereDateRange,
    });

    // ດຶງຍອດລວມລາຍຈ່າຍ (Expenses)
    const expenseAggregate = await this.prisma.expense.aggregate({
      _sum: { amountLak: true },
      _count: { id: true },
      where: whereDateRange,
    });

    // ແຍກລາຍຮັບຕາມ Payment Method (CASH / BCEL_ONE_QR)
    const incomeByMethod = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountLak: true },
      _count: { id: true },
      where: whereDateRange,
    });

    // 👈 ແຍກລາຍຮັບຕາມ Category (ເພີ່ມເຂົ້າມາໃຫ້ກົງກັບ Frontend)
    const incomeByCategory = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountLak: true },
      _count: { id: true },
      where: whereDateRange,
    });

    // ແຍກລາຍຈ່າຍຕາມ Category
    const expenseByCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      _sum: { amountLak: true },
      _count: { id: true },
      where: whereDateRange,
    });

    const totalIncome = Number(incomeAggregate._sum.amountLak || 0);
    const totalExpense = Number(expenseAggregate._sum.amountLak || 0);
    const netProfit = totalIncome - totalExpense;

    return {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalIncome, // ລາຍຮັບລວມ
        totalExpense, // ລາຍຈ່າຍລວມ
        netProfit, // ກຳໄລ-ຂາດທຶນສຸດທິ
        status: netProfit >= 0 ? 'PROFIT' : 'LOSS',
        transactionCounts: {
          payments: incomeAggregate._count.id,
          expenses: expenseAggregate._count.id,
        },
      },
      incomeByMethod,
      incomeByCategory, // 👈 ส่ง property ນີ້ໃຫ້ Frontend ໃຊ້ສະແດງຜົນ
      expenseByCategory,
    };
  }

  // 2. ສະຫຼຸບສະຖິຕິສະມາຊິກ ແລະ ການ Check-in
  async getMemberCheckInReport(filter: GetReportFilterDto) {
    const { startDate, endDate } = this.getDateRange(filter);
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    // ຈຳນວນສະມາຊິກທີ່ Check-in ໃນຊ່ວງເວລາທີ່ເລືອກ
    const checkInCount = await this.prisma.member.count({
      where: {
        lastCheckIn: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // ຈຳນວນສະມາຊິກທັງໝົດ
    const totalMembers = await this.prisma.member.count();

    // ຈຳນວນສະມາຊິກທີ່ຍັງບໍ່ໝົດອາຍຸ (Active)
    const activeMembers = await this.prisma.member.count({
      where: {
        OR: [
          { expireDate: { gte: now } },
          { remainingSessions: { gt: 0 } },
        ],
      },
    });

    // ສະມາຊິກທີ່ກຳລັງຈະໝົດອາຍຸໃນ 7 ວັນຂ້າງໜ້າ
    const expiringSoonMembers = await this.prisma.member.findMany({
      where: {
        expireDate: {
          gte: now,
          lte: in7Days,
        },
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        expireDate: true,
      },
      orderBy: { expireDate: 'asc' },
    });

    return {
      period: {
        startDate,
        endDate,
      },
      stats: {
        totalCheckInsInPeriod: checkInCount,
        totalMembers,
        activeMembers,
        expiringSoonCount: expiringSoonMembers.length,
      },
      expiringSoonMembers,
    };
  }

  // Helper Function: ກຳນົດວັນທີ Default (ຖ້າບໍ່ສົ່ງມາ ໃຫ້ໃຊ້ວັນທີ 1 ຂອງເດືອນປັດຈຸບັນ ເຖິງ ປັດຈຸບັນ)
  private getDateRange(filter: GetReportFilterDto) {
    const now = new Date();

    const startDate = filter.startDate
      ? new Date(filter.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1); // ວັນທີ 1 ຂອງເດືອນ

    const endDate = filter.endDate
      ? new Date(filter.endDate)
      : new Date(); // ປັດຈຸບັນ

    // ຕັ້ງເວລາໃຫ້ກວມເອົາໝົດມື້
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }
}