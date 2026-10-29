import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ShiftStatus } from '@prisma/client';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) { }

  // 1. ເປີດກະໃໝ່ (Open Shift)
  @Post('open')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  openShift(@Request() req: any, @Body() dto: OpenShiftDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.shiftsService.openShift(Number(staffId), dto);
  }

  // 2. ດຶງສະຖານະກະປັດຈຸບັນ
  @Get('current')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  getCurrentShift() {
    return this.shiftsService.getCurrentShift();
  }

  // 3. ປິດກະ (Close Shift)
  @Post(':id/close')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  closeShift(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: CloseShiftDto,
  ) {
    const staffId = req.user?.id || req.user?.sub;
    return this.shiftsService.closeShift(id, Number(staffId), dto);
  }

  // 4. ດຶງລາຍການກະທັງໝົດ (ADMIN)
  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query('status') status?: ShiftStatus) {
    return this.shiftsService.findAll(status);
  }

  // 5. ດຶງລາຍລະອຽດກະ
  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.findOne(id);
  }
}
