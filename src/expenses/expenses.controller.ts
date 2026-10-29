import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
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
    const staffId = req.user?.id || req.user?.sub;
    return this.expensesService.create(Number(staffId), createExpenseDto);
  }

  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  @Get('expense/total')
  async getTotalExpense() {
    return this.expensesService.getTotalExpense();
  }

  @Get('summary/monthly')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  async getMonthlySummary(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.expensesService.getMonthlySummary(parsedYear);
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
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(id);
  }
}