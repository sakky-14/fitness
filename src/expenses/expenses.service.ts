import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Currency, ExpenseCategory } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) { }

  // 1. ບັນທຶກລາຍຈ່າຍໃໝ່
  async create(staffId: number, dto: CreateExpenseDto) {
    if (!staffId) {
      throw new BadRequestException('ບໍ່ພົບຂໍ້ມູນພະນັກງານ (staffId)');
    }
    return this.prisma.expense.create({
      data: {
        staffId,
        title: dto.title,
        category: dto.category || ExpenseCategory.SUPPLIES,
        amountLak: Number(dto.amountLak),
        paidCurrency: dto.paidCurrency || Currency.LAK,
        exchangeRate: Number(dto.exchangeRate || 1),
        amountPaid: dto.amountPaid !== undefined ? Number(dto.amountPaid) : Number(dto.amountLak),
        receiptUrl: dto.receiptUrl || null,
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });
  }

  // 2. ດຶງລາຍການລາຍຈ່າຍທັງໝົດ
  async findAll() {
    return this.prisma.expense.findMany({
      include: {
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. ຄິດໄລ່ຍອດລາຍຈ່າຍລວມ
  async getTotalExpense() {
    const result = await this.prisma.expense.aggregate({
      _sum: {
        amountLak: true,
      },
    });
    return { totalExpense: result._sum.amountLak || 0 };
  }

  // 4. ສະຫຼຸບລາຍຈ່າຍປະຈຳເດືອນ ແລະ ແຍກຕາມໝວດໝູ່ (Monthly Summary & Categories)
  async getMonthlySummary(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const expenses = await this.prisma.expense.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalAmountLak: 0,
      count: 0,
    }));

    const byCategory: Record<string, number> = {};

    for (const exp of expenses) {
      const m = exp.createdAt.getMonth();
      const amount = Number(exp.amountLak);
      months[m].totalAmountLak += amount;
      months[m].count += 1;

      byCategory[exp.category] = (byCategory[exp.category] || 0) + amount;
    }

    const totalExpense = expenses.reduce((acc, cur) => acc + Number(cur.amountLak), 0);

    return {
      year: targetYear,
      totalExpense,
      totalCount: expenses.length,
      monthlyBreakdown: months,
      byCategory,
    };
  }

  // 5. ດຶງລາຍຈ່າຍຕາມ ID
  async findOne(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນລາຍຈ່າຍນີ້');
    }

    return expense;
  }

  // 6. ແກ້ໄຂລາຍຈ່າຍ
  async update(id: number, dto: UpdateExpenseDto) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { id },
      data: dto,
      include: {
        staff: { select: { id: true, name: true } },
      },
    });
  }

  // 7. ລົບລາຍຈ່າຍ (ສະເພາະ ADMIN)
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}