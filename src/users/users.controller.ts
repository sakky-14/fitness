import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // ປ່ຽນມາໃຊ້ Guards ໂຕໃໝ່
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ສ້າງ Staff ໃໝ່ໄດ້
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ເບິ່ງລາຍຊື່ Staff ທັງໝົດໄດ້
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ແກ້ໄຂ User ໄດ້
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ລົບ User ໄດ້
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}