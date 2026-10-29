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

  // 2. ລາຍງານກຳໄລ-ຂາດທຶນປະຈຳວັນ (Daily P&L)
  @Get('daily-pl')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  getDailyPL(@Query('date') date?: string) {
    return this.reportsService.getDailyPL(date);
  }

  // 3. ສະຫຼຸບງົບການເງິນລາຍເດືອນຕະຫຼອດປີ (Monthly Financial Breakdown)
  @Get('monthly-breakdown')
  @Roles(Role.ADMIN)
  getMonthlyBreakdown(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.reportsService.getMonthlyBreakdown(parsedYear);
  }

  // 4. ວິເຄາະສະຖິຕິການເຂົ້າໃຊ້ງານ ແລະ ສະມາຊິກ Active vs Inactive (Attendance Analytics)
  @Get('attendance-analytics')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF, Role.TRAINER)
  getAttendanceAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAttendanceAnalytics({ startDate, endDate });
  }

  // 5. ລາຍງານສະຖິຕິສະມາຊິກ & Check-in (ຮັກສາ Endpoint ເດີມ 100%)
  @Get('check-ins')
  getCheckInReport(@Query() filter: GetReportFilterDto) {
    return this.reportsService.getMemberCheckInReport(filter);
  }
}