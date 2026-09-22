import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) { }

  // 1. ສ້າງ Package ໃໝ່
  async create(dto: CreatePackageDto) {
    return this.prisma.package.create({
      data: {
        name: dto.name,
        priceLak: dto.priceLak,
        durationDays: dto.durationDays,
        sessions: dto.sessions,
      },
    });
  }

  // 2. ດຶງລາຍການ Package ທັງໝົດ
  async findAll() {
    return this.prisma.package.findMany({
      orderBy: { id: 'asc' },
    });
  }

  // 3. ດຶງ Package ຕາມ ID
  async findOne(id: number) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
    });
    if (!pkg) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນແພັກເກັດນີ້');
    }
    return pkg;
  }

  // 4. ແກ້ໄຂ Package
  async update(id: number, dto: UpdatePackageDto) {
    await this.findOne(id); // ກວດສອບກ່ອນວ່າມີ Package ນີ້ຫຼືບໍ່
    return this.prisma.package.update({
      where: { id },
      data: dto,
    });
  }

  // 5. ລົບ Package
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.package.delete({
      where: { id },
    });
  }
}