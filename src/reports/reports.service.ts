import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetReportFilterDto } from './dto/get-report-filter.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  // 1. ສະຫຼຸບລາຍງານການເງິນ (ກຳໄລ-ຂາດທຶນ, ລາຍຮັບ, ລາຍຈ່າຍ) ຕາມຊ່ວງເວລາ
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

    // ແຍກລາຍຮັບຕາມ Payment Method (CASH, BCEL_ONE_QR, BANK_TRANSFER)
    const incomeByMethod = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountLak: true },
      _count: { id: true },
      where: whereDateRange,
    });

    // ແຍກລາຍຮັບຕາມ Category / Currency
    const incomeByCurrency = await this.prisma.payment.groupBy({
      by: ['paidCurrency'],
      _sum: { amountPaid: true, amountLak: true },
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
        totalIncome,
        totalExpense,
        netProfit,
        status: netProfit >= 0 ? 'PROFIT' : 'LOSS',
        profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) + '%' : '0%',
        transactionCounts: {
          payments: incomeAggregate._count.id,
          expenses: expenseAggregate._count.id,
        },
      },
      incomeByMethod,
      incomeByCurrency,
      expenseByCategory,
    };
  }

  // 2. ລາຍງານກຳໄລ-ຂາດທຶນປະຈຳວັນ (Daily P&L)
  async getDailyPL(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const whereDate = {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereDate,
        include: {
          package: { select: { name: true, type: true } },
          product: { select: { name: true } },
        },
      }),
      this.prisma.expense.findMany({
        where: whereDate,
      }),
    ]);

    let packageRevenueLak = 0;
    let productRevenueLak = 0;
    let otherRevenueLak = 0;

    const byMethod: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};

    let totalRevenue = 0;
    for (const p of payments) {
      const amount = Number(p.amountLak);
      totalRevenue += amount;

      if (p.packageId) packageRevenueLak += amount;
      else if (p.productId) productRevenueLak += amount;
      else otherRevenueLak += amount;

      byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + amount;
      byCurrency[p.paidCurrency] = (byCurrency[p.paidCurrency] || 0) + Number(p.amountPaid);
    }

    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      const amount = Number(e.amountLak);
      totalExpense += amount;
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + amount;
    }

    const netProfit = totalRevenue - totalExpense;

    return {
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        totalRevenue,
        totalExpense,
        netProfit,
        status: netProfit >= 0 ? 'PROFIT' : 'LOSS',
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%',
        transactionCount: {
          payments: payments.length,
          expenses: expenses.length,
        },
      },
      revenueStreams: {
        packagesLak: packageRevenueLak,
        productsLak: productRevenueLak,
        otherLak: otherRevenueLak,
      },
      paymentsByMethod: byMethod,
      paymentsByCurrency: byCurrency,
      expensesByCategory: expenseByCategory,
    };
  }

  // 3. ສະຫຼຸບງົບການເງິນລາຍເດືອນຕະຫຼອດປີ (Monthly Financial Breakdown)
  async getMonthlyBreakdown(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { amountLak: true, createdAt: true },
      }),
      this.prisma.expense.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { amountLak: true, createdAt: true },
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenueLak: 0,
      expenseLak: 0,
      netProfitLak: 0,
      status: 'NEUTRAL',
    }));

    for (const p of payments) {
      const m = p.createdAt.getMonth();
      months[m].revenueLak += Number(p.amountLak);
    }

    for (const e of expenses) {
      const m = e.createdAt.getMonth();
      months[m].expenseLak += Number(e.amountLak);
    }

    let yearRevenue = 0;
    let yearExpense = 0;

    for (const m of months) {
      m.netProfitLak = m.revenueLak - m.expenseLak;
      m.status = m.netProfitLak >= 0 ? 'PROFIT' : 'LOSS';
      yearRevenue += m.revenueLak;
      yearExpense += m.expenseLak;
    }

    const yearNetProfit = yearRevenue - yearExpense;

    return {
      year: targetYear,
      annualSummary: {
        totalRevenue: yearRevenue,
        totalExpense: yearExpense,
        netProfit: yearNetProfit,
        status: yearNetProfit >= 0 ? 'PROFIT' : 'LOSS',
        profitMargin: yearRevenue > 0 ? ((yearNetProfit / yearRevenue) * 100).toFixed(2) + '%' : '0%',
      },
      months,
    };
  }

  // 4. ວິເຄາະສະຖິຕິການເຂົ້າໃຊ້ງານ ແລະ ສະມາຊິກ Active vs Inactive (Attendance Analytics)
  async getAttendanceAnalytics(filter?: { startDate?: string; endDate?: string }) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const dateRange = this.getDateRange(filter || {});

    // ດຶງຂໍ້ມູນສະມາຊິກທັງໝົດ
    const allMembers = await this.prisma.member.findMany({
      include: {
        package: { select: { name: true, type: true } },
      },
      orderBy: { lastCheckIn: 'desc' },
    });

    const totalMembers = allMembers.length;
    let activeMembersCount = 0;
    let inactiveMembersCount = 0;
    let neverCheckedInCount = 0;

    const inactiveMembersList: any[] = [];

    for (const member of allMembers) {
      if (!member.lastCheckIn) {
        neverCheckedInCount++;
        inactiveMembersList.push({
          id: member.id,
          code: member.code,
          fullName: member.fullName,
          phone: member.phone,
          packageName: member.package?.name || 'N/A',
          lastCheckIn: null,
          daysSinceLastCheckIn: null,
          status: 'NEVER_CHECKED_IN',
        });
      } else if (member.lastCheckIn >= thirtyDaysAgo) {
        activeMembersCount++;
      } else {
        inactiveMembersCount++;
        const diffMs = now.getTime() - member.lastCheckIn.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        inactiveMembersList.push({
          id: member.id,
          code: member.code,
          fullName: member.fullName,
          phone: member.phone,
          packageName: member.package?.name || 'N/A',
          lastCheckIn: member.lastCheckIn,
          daysSinceLastCheckIn: days,
          status: 'INACTIVE',
        });
      }
    }

    // ດຶງປະຫວັດການ Check-in ໃນຊ່ວງວັນທີທີ່ກຳນົດ
    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        checkInAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    // ວິເຄາະ Peak Hours (0-23 ຊົ່ວໂມງ)
    const peakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      checkIns: 0,
    }));

    for (const ci of checkIns) {
      const hour = ci.checkInAt.getHours();
      peakHours[hour].checkIns += 1;
    }

    return {
      period: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      memberOverview: {
        totalMembers,
        activeMembers: activeMembersCount, // ເຂົ້າຫຼິ້ນພາຍໃນ 30 ວັນ
        inactiveMembers: inactiveMembersCount, // ບໍ່ໄດ້ມາເກີນ 30 ວັນ
        neverCheckedIn: neverCheckedInCount,
        activeRate: totalMembers > 0 ? ((activeMembersCount / totalMembers) * 100).toFixed(1) + '%' : '0%',
      },
      totalCheckInsInPeriod: checkIns.length,
      peakHours,
      inactiveMembersForRetention: inactiveMembersList.slice(0, 50), // ສົ່ງລາຍຊື່ໃຫ້ໂທຕິດຕາມລູກຄ້າ
    };
  }

  // 5. ສະຫຼຸບສະຖິຕິສະມາຊິກ ແລະ ການ Check-in (ຮັກສາ Endpoint ເດີມໄວ້ 100%)
  async getMemberCheckInReport(filter: GetReportFilterDto) {
    const { startDate, endDate } = this.getDateRange(filter);
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    const checkInCount = await this.prisma.member.count({
      where: {
        lastCheckIn: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMembers = await this.prisma.member.count();

    const activeMembers = await this.prisma.member.count({
      where: {
        OR: [
          { expireDate: { gte: now } },
          { remainingSessions: { gt: 0 } },
        ],
      },
    });

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

  // Helper Function: ກຳນົດວັນທີ Default
  private getDateRange(filter: GetReportFilterDto) {
    const now = new Date();

    const startDate = filter.startDate
      ? new Date(filter.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const endDate = filter.endDate
      ? new Date(filter.endDate)
      : new Date();

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }
}