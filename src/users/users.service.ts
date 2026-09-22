import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // 1. ສ້າງ User / Staff ໃໝ່
  async create(dto: CreateUserDto) {
    // ກວດສອບເບີໂທຊ້ຳ
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('ເບີໂທລະສັບນີ້ຖືກໃຊ້ງານໃນລະບົບແລ້ວ');
    }

    // Hash ລະຫັດຜ່ານດ້ວຍ bcrypt (salt 10 rounds)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        passwordHash: hashedPassword,
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    });
  }

  // 2. ດຶງລາຍຊື່ User ທັງໝົດ
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  // 3. ດຶງຂໍ້ມູນ User ຕາມ ID
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້ນີ້');
    }
    return user;
  }

  // 4. ແກ້ໄຂຂໍ້ມູນ User
  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id); // ກວດສອບວ່າພົບ User ຫຼື ບໍ່

    const updateData: any = { ...dto };

    // ຖ້າມີການສົ່ງ password ມາໃໝ່ ໃຫ້ Hash ລະຫັດຜ່ານກ່ອນ Save
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
      delete updateData.password;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    });
  }

  // 5. ລົບ User
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
      select: { id: true, name: true },
    });
  }
}