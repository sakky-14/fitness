import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CheckInDto } from './dto/check-in.dto';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) { }

  // 1. ສ້າງສະມາຊິກໃໝ່
  async create(dto: CreateMemberDto) {
    const existingCode = await this.prisma.member.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException('ລະຫັດບັດສະມາຊິກນີ້ມີໃນລະບົບແລ້ວ');
    }

    const existingPhone = await this.prisma.member.findUnique({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('ເບີໂທລະສັບນີ້ມີໃນລະບົບແລ້ວ');
    }

    return this.prisma.member.create({
      data: {
        code: dto.code,
        fullName: dto.fullName,
        phone: dto.phone,
        photoUrl: dto.photoUrl,
        packageId: dto.packageId,
        expireDate: dto.expireDate ? new Date(dto.expireDate) : null,
        remainingSessions: dto.remainingSessions ?? 0,
      },
      include: { package: true },
    });
  }

  // 2. ດຶງລາຍຊື່ສະມາຊິກທັງໝົດ
  async findAll() {
    return this.prisma.member.findMany({
      include: { package: true },
      orderBy: { id: 'desc' },
    });
  }

  // 3. ດຶງຂໍ້ມູນສະມາຊິກຕາມ ID
  async findOne(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { package: true },
    });
    if (!member) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສະມາຊິກນີ້');
    }
    return member;
  }

  // 4. ແກ້ໄຂຂໍ້ມູນສະມາຊິກ
  async update(id: number, dto: UpdateMemberDto) {
    await this.findOne(id);

    const dataToUpdate: any = { ...dto };
    if (dto.expireDate) {
      dataToUpdate.expireDate = new Date(dto.expireDate);
    }

    return this.prisma.member.update({
      where: { id },
      data: dataToUpdate,
      include: { package: true },
    });
  }

  // 5. ລົບສະມາຊິກ
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.member.delete({
      where: { id },
    });
  }

  // ⚡ 6. ລະບົບ Scan Check-in + Anti-Passback Logic (15 ນາທີ)
  async checkIn(dto: CheckInDto) {
    const member = await this.prisma.member.findUnique({
      where: { code: dto.code },
      include: { package: true },
    });

    if (!member) {
      throw new NotFoundException('ບໍ່ພົບລະຫັດບັດສະມາຊິກນີ້ໃນລະບົບ');
    }

    const now = new Date();

    // 🛑 [CHECK 1]: Anti-Passback Cooldown (15 ນາທີ)
    if (member.lastCheckIn) {
      const diffInMs = now.getTime() - member.lastCheckIn.getTime();
      const diffInMinutes = diffInMs / (1000 * 60);
      const COOLDOWN_MINUTES = 15;

      if (diffInMinutes < COOLDOWN_MINUTES) {
        const remainingMinutes = Math.ceil(COOLDOWN_MINUTES - diffInMinutes);
        throw new BadRequestException(
          `Anti-Passback: ສະມາຊິກເພິ່ງ Scan ເຂົ້າໄປ. ກະລຸນາລໍຖ້າອີກ ${remainingMinutes} ນາທີ ຈຶ່ງສາມາດ Scan ໄດ້ອີກຄັ້ງ`,
        );
      }
    }

    // 🛑 [CHECK 2]: ກວດສອບອາຍຸແພັກເກັດ (ກໍລະນີເປັນແພັກເກັດກຳນົດວັນ)
    if (member.expireDate && member.expireDate < now) {
      throw new BadRequestException('ແພັກເກັດສະມາຊິກຂອງທ່ານ ໝົດອາຍຸແລ້ວ!');
    }

    // 🛑 [CHECK 3]: ກວດສອບ ຈຳນວນຄັ້ງທີ່ເຫຼືອ (ກໍລະນີເປັນແພັກເກັດຄູປອງນັບຄັ້ງ)
    if (member.package?.sessions && (!member.remainingSessions || member.remainingSessions <= 0)) {
      throw new BadRequestException('ຈຳນວນຄັ້ງໃນການເຂົ້າໃຊ້ງານຂອງທ່ານ ໝົດແລ້ວ!');
    }

    // 🔄 [ACTION]: ອັບເດດຂໍ້ມູນການ Check-in
    const updateData: any = {
      lastCheckIn: now,
    };

    // ຖ້າເປັນແພັກເກັດນັບຄັ້ງ ໃຫ້ຫັກອອກ 1 ຄັ້ງ
    if (member.remainingSessions && member.remainingSessions > 0) {
      updateData.remainingSessions = member.remainingSessions - 1;
    }

    const updatedMember = await this.prisma.member.update({
      where: { id: member.id },
      data: updateData,
      include: { package: true },
    });

    return {
      message: 'Check-in ສຳເລັດ!',
      status: 'SUCCESS',
      member: {
        id: updatedMember.id,
        fullName: updatedMember.fullName,
        code: updatedMember.code,
        photoUrl: updatedMember.photoUrl,
        packageName: updatedMember.package?.name || 'N/A',
        remainingSessions: updatedMember.remainingSessions,
        expireDate: updatedMember.expireDate,
        lastCheckIn: updatedMember.lastCheckIn,
      },
    };
  }
}