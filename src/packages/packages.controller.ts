import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard) // ປ່ຽນມາໃຊ້ Guards ໂຕໃໝ່
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) { }

  @Post()
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN ເທົ່ານັ້ນທີ່ສ້າງ Package ໃໝ່ໄດ້
  create(@Body() createPackageDto: CreatePackageDto) {
    return this.packagesService.create(createPackageDto);
  }

  @Get() // ທັງ ADMIN ແລະ STAFF ເບິ່ງລາຍການ Package ໄດ້
  findAll() {
    return this.packagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePackageDto: UpdatePackageDto,
  ) {
    return this.packagesService.update(id, updatePackageDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // ສະເພາະ ADMIN
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.remove(id);
  }
}