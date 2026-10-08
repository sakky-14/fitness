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
        amountLak: dto.amountLak,
        paidCurrency: dto.paidCurrency || Currency.LAK,
        exchangeRate: dto.exchangeRate || 1,
        amountPaid: dto.amountPaid,
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

  // 3. ຄິດໄລ່ຍອດລາຍຈ່າຍລວມ (👈 ເພີ່ມໃໝ່)
  async getTotalExpense() {
    const result = await this.prisma.expense.aggregate({
      _sum: {
        amountLak: true,
      },
    });
    return { totalExpense: result._sum.amountLak || 0 };
  }

  // 4. ດຶງລາຍຈ່າຍຕາມ ID
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

  // 5. ແກ້ໄຂລາຍຈ່າຍ
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

  // 6. ລົບລາຍຈ່າຍ (ສະເພາະ ADMIN)
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}