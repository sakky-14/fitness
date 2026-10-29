import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { RecordPTSessionDto } from './dto/record-pt-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) { }

  // 1. ສ້າງ Trainer ໃໝ່ (ADMIN)
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTrainerDto) {
    return this.trainersService.create(dto);
  }

  // 2. ດຶງລາຍຊື່ Trainer ທັງໝົດ
  @Get()
  findAll() {
    return this.trainersService.findAll();
  }

  // 3. ບັນທຶກການສອນ PT (ຕັດຊົ່ວໂມງ) (ADMIN, TRAINER, CASHIER)
  @Post('sessions')
  @Roles(Role.ADMIN, Role.TRAINER, Role.CASHIER, Role.STAFF)
  recordPTSession(@Body() dto: RecordPTSessionDto) {
    return this.trainersService.recordPTSession(dto);
  }

  // 4. ດຶງລາຍການ Session ການສອນ PT ທັງໝົດ
  @Get('sessions')
  getPTSessions(
    @Query('trainerId') trainerId?: string,
    @Query('memberId') memberId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trainersService.getPTSessions({
      trainerId: trainerId ? parseInt(trainerId, 10) : undefined,
      memberId: memberId ? parseInt(memberId, 10) : undefined,
      startDate,
      endDate,
    });
  }

  // 5. ສະຫຼຸບຜົນງານ ແລະ ຄ່າຄອມມິດຊັ່ນຂອງ Trainer
  @Get(':id/performance')
  @Roles(Role.ADMIN, Role.TRAINER)
  getPerformance(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.trainersService.getTrainerPerformance(id, startDate, endDate);
  }

  // 6. ດຶງຂໍ້ມູນ Trainer ຕາມ ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainersService.findOne(id);
  }

  // 7. ແກ້ໄຂ Trainer (ADMIN)
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainerDto,
  ) {
    return this.trainersService.update(id, dto);
  }

  // 8. ລົບ Trainer (ADMIN)
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.trainersService.remove(id);
  }
}
