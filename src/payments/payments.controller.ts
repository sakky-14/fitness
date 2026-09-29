import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post()
  create(@Request() req: any, @Body() createPaymentDto: CreatePaymentDto) {
    const staffId = req.user?.id || req.user?.userId; // ດຶງ Staff ID ຈາກ JWT Token
    return this.paymentsService.create(staffId, createPaymentDto);
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }
}