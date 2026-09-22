import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) { }

  // Scan Check-in (ທັງ ADMIN ແລະ STAFF ສາມາດ Scan ໃຫ້ສະມາຊິກໄດ້)
  @Post('check-in')
  checkIn(@Body() checkInDto: CheckInDto) {
    return this.membersService.checkIn(checkInDto);
  }

  @Post()
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  findAll() {
    return this.membersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ລົບສະມາຊິກໄດ້
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.remove(id);
  }
}