import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) { }

  @Post()
  create(@Request() req: any, @Body() createExpenseDto: CreateExpenseDto) {
    const staffId = req.user?.id || req.user?.userId; // ດຶງ Staff ID ຈາກ JWT Token ອັດໂນມັດ
    return this.expensesService.create(staffId, createExpenseDto);
  }

  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  // 👈 ເພີ່ມ Endpoint ດຶງຍອດລາຍຈ່າຍລວມ (ຕ້ອງໄວ້ກ່ອນ @Get(':id') เสมໍ)
  @Get('expense/total')
  async getTotalExpense() {
    return this.expensesService.getTotalExpense();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ລົບລາຍຈ່າຍໄດ້
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(id);
  }
}