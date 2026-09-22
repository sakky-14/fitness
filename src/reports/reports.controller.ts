import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetReportFilterDto } from './dto/get-report-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  // 1. ລາຍງານການເງິນ (ກຳໄລ-ຂາດທຶນ) - ADMIN Only
  @Get('financial')
  @Roles(Role.ADMIN)
  getFinancialReport(@Query() filter: GetReportFilterDto) {
    return this.reportsService.getFinancialReport(filter);
  }

  // 2. ລາຍງານສະຖິຕິສະມາຊິກ & Check-in - ທັງ ADMIN ແລະ STAFF ເບິ່ງໄດ້
  @Get('check-ins')
  getCheckInReport(@Query() filter: GetReportFilterDto) {
    return this.reportsService.getMemberCheckInReport(filter);
  }
}