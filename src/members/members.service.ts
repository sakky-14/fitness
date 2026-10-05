// import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { CreateMemberDto } from './dto/create-member.dto';
// import { UpdateMemberDto } from './dto/update-member.dto';
// import { CheckInDto } from './dto/check-in.dto';

// @Injectable()
// export class MembersService {
//   constructor(private prisma: PrismaService) { }

//   // 1. ສ້າງສະມາຊິກໃໝ່
//   async create(dto: CreateMemberDto) {
//     const existingCode = await this.prisma.member.findUnique({
//       where: { code: dto.code },
//     });
//     if (existingCode) {
//       throw new ConflictException('ລະຫັດບັດສະມາຊິກນີ້ມີໃນລະບົບແລ້ວ');
//     }

//     const existingPhone = await this.prisma.member.findUnique({
//       where: { phone: dto.phone },
//     });
//     if (existingPhone) {
//       throw new ConflictException('ເບີໂທລະສັບນີ້ມີໃນລະບົບແລ້ວ');
//     }

//     const packageId = dto.packageId ? Number(dto.packageId) : null;
//     let calculatedRemainingSessions: number | null | undefined =
//       dto.remainingSessions !== undefined && dto.remainingSessions !== null && (dto.remainingSessions as any) !== ''
//         ? Number(dto.remainingSessions)
//         : undefined;
//     let calculatedExpireDate = dto.expireDate ? new Date(dto.expireDate) : null;

//     if (packageId) {
//       const pkg = await this.prisma.package.findUnique({
//         where: { id: packageId },
//       });
//       if (!pkg) {
//         throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນແພັກເກັດນີ້');
//       }

//       // ຖ້າไม่ได้ระบุ remainingSessions มา ให้คำนวณตาม Package (sessions หรือ durationDays: 1 วัน -> 1 ครั้ง, 30 วัน -> 30 ครั้ง, 365 วัน -> 365 ครั้ง)
//       if (calculatedRemainingSessions === undefined || calculatedRemainingSessions === null || isNaN(calculatedRemainingSessions)) {
//         calculatedRemainingSessions = pkg.sessions ?? null;
//       }

//       // ຖ້າไม่ได้ระบุ expireDate มา และ package มี durationDays ให้คำนวณวันหมดอายุ
//       if (!calculatedExpireDate && pkg.durationDays) {
//         const now = new Date();
//         const expire = new Date(now);
//         expire.setDate(expire.getDate() + pkg.durationDays);
//         calculatedExpireDate = expire;
//       }
//     } else {
//       calculatedRemainingSessions = calculatedRemainingSessions ?? null;
//     }

//     return this.prisma.member.create({
//       data: {
//         code: dto.code,
//         fullName: dto.fullName,
//         phone: dto.phone,
//         photoUrl: dto.photoUrl,
//         packageId: packageId,
//         expireDate: calculatedExpireDate,
//         remainingSessions: calculatedRemainingSessions,
//       },
//       include: { package: true },
//     });
//   }

//   // 2. ດຶງລາຍຊື່ສະມາຊິກທັງໝົດ
//   async findAll() {
//     return this.prisma.member.findMany({
//       include: { package: true },
//       orderBy: { id: 'desc' },
//     });
//   }

//   // 3. ດຶງຂໍ້ມູນສະມາຊິກຕາມ ID
//   async findOne(id: number) {
//     const member = await this.prisma.member.findUnique({
//       where: { id: Number(id) },
//       include: { package: true },
//     });
//     if (!member) {
//       throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສະມາຊິກນີ້');
//     }
//     return member;
//   }

//   // 4. ແກ້ໄຂຂໍ້ມູນສະມາຊິກ
//   async update(id: number, dto: UpdateMemberDto) {
//     await this.findOne(id);

//     const dataToUpdate: any = { ...dto };

//     if (dto.packageId) {
//       const packageId = Number(dto.packageId);
//       dataToUpdate.packageId = packageId;

//       const pkg = await this.prisma.package.findUnique({
//         where: { id: packageId },
//       });
//       if (!pkg) {
//         throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນແພັກເກັດນີ້');
//       }

//       if (dto.remainingSessions === undefined) {
//         dataToUpdate.remainingSessions = pkg.sessions ?? null;
//       }
//       if (!dto.expireDate && pkg.durationDays) {
//         const now = new Date();
//         const expire = new Date(now);
//         expire.setDate(expire.getDate() + pkg.durationDays);
//         dataToUpdate.expireDate = expire;
//       }
//     }

//     if (dto.remainingSessions !== undefined && dto.remainingSessions !== null && (dto.remainingSessions as any) !== '') {
//       dataToUpdate.remainingSessions = Number(dto.remainingSessions);
//     }

//     if (dto.expireDate) {
//       dataToUpdate.expireDate = new Date(dto.expireDate);
//     }

//     return this.prisma.member.update({
//       where: { id: Number(id) },
//       data: dataToUpdate,
//       include: { package: true },
//     });
//   }

//   // 5. ລົບສະມາຊິກ
//   async remove(id: number) {
//     await this.findOne(id);
//     return this.prisma.member.delete({
//       where: { id },
//     });
//   }

//   // ⚡ 6. ລະບົບ Scan Check-in + Anti-Passback Logic (1 ນາທີ)
//   async checkIn(dto: CheckInDto) {
//     const member = await this.prisma.member.findUnique({
//       where: { code: dto.code },
//       include: { package: true },
//     });

//     if (!member) {
//       throw new NotFoundException('ບໍ່ພົບລະຫັດບັດສະມາຊິກນີ້ໃນລະບົບ');
//     }

//     const now = new Date();

//     // 🛑 [CHECK 1]: Anti-Passback Cooldown (1 ນາທີ)
//     if (member.lastCheckIn) {
//       const diffInMs = now.getTime() - member.lastCheckIn.getTime();
//       const diffInMinutes = diffInMs / (1000 * 60);
//       const COOLDOWN_MINUTES = 1;

//       if (diffInMinutes < COOLDOWN_MINUTES) {
//         const remainingMinutes = Math.ceil(COOLDOWN_MINUTES - diffInMinutes);
//         throw new BadRequestException(
//           `Anti-Passback: ສະມາຊິກເພິ່ງ Scan ເຂົ້າໄປ. ກະລຸນາລໍຖ້າອີກ ${remainingMinutes} ນາທີ ຈຶ່ງສາມາດ Scan ໄດ້ອີກຄັ້ງ`,
//         );
//       }
//     }

//     // 🛑 [CHECK 2]: ກວດສອບອາຍຸແພັກເກັດ (ກໍລະນີເປັນແພັກເກັດກຳນົດວັນ)
//     if (member.expireDate && member.expireDate < now) {
//       throw new BadRequestException('ແພັກເກັດສະມາຊິກຂອງທ່ານ ໝົດອາຍຸແລ້ວ!');
//     }

//     // 🛑 [CHECK 3]: ກວດສອບ ຈຳນວນຄັ້ງທີ່ເຫຼືອ (ສະເພາະແພັກເກັດທີ່ມີ remainingSessions)
//     if (member.remainingSessions !== null && member.remainingSessions !== undefined) {
//       if (member.remainingSessions <= 0) {
//         throw new BadRequestException('ຈຳນວນຄັ້ງໃນການເຂົ້າໃຊ້ງານຂອງທ່ານ ໝົດແລ້ວ!');
//       }
//     }

//     // 🔄 [ACTION]: ອັບເດດຂໍ້ມູນການ Check-in
//     const updateData: any = {
//       lastCheckIn: now,
//     };

//     // ຖ້າເປັນແພັກເກັດນັບຄັ້ງ (remainingSessions > 0) ໃຫ້ຫັກອອກ 1 ຄັ້ງ
//     if (member.remainingSessions !== null && member.remainingSessions !== undefined && member.remainingSessions > 0) {
//       updateData.remainingSessions = member.remainingSessions - 1;
//     }

//     const updatedMember = await this.prisma.member.update({
//       where: { id: member.id },
//       data: updateData,
//       include: { package: true },
//     });

//     // คำนวณจำนวนวันที่เหลือ (remainingDays) จาก expireDate
//     let remainingDays: number | null = null;
//     if (updatedMember.expireDate) {
//       const diffInMs = updatedMember.expireDate.getTime() - now.getTime();
//       remainingDays = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
//     }

//     return {
//       message: 'Check-in ສຳເລັດ!',
//       status: 'SUCCESS',
//       member: {
//         id: updatedMember.id,
//         fullName: updatedMember.fullName,
//         code: updatedMember.code,
//         photoUrl: updatedMember.photoUrl,
//         packageName: updatedMember.package?.name || 'N/A',
//         remainingSessions: updatedMember.remainingSessions,
//         remainingDays: remainingDays,
//         expireDate: updatedMember.expireDate,
//         lastCheckIn: updatedMember.lastCheckIn,
//       },
//     };
//   }
// }

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

    const packageId = dto.packageId ? Number(dto.packageId) : null;
    let calculatedRemainingSessions: number | null | undefined =
      dto.remainingSessions !== undefined && dto.remainingSessions !== null && (dto.remainingSessions as any) !== ''
        ? Number(dto.remainingSessions)
        : undefined;
    let calculatedExpireDate = dto.expireDate ? new Date(dto.expireDate) : null;

    if (packageId) {
      const pkg = await this.prisma.package.findUnique({
        where: { id: packageId },
      });
      if (!pkg) {
        throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນແພັກເກັດນີ້');
      }

      if (calculatedRemainingSessions === undefined || calculatedRemainingSessions === null || isNaN(calculatedRemainingSessions)) {
        calculatedRemainingSessions = pkg.sessions ?? null;
      }

      if (!calculatedExpireDate && pkg.durationDays) {
        const now = new Date();
        const expire = new Date(now);
        expire.setDate(expire.getDate() + pkg.durationDays);
        calculatedExpireDate = expire;
      }
    } else {
      calculatedRemainingSessions = calculatedRemainingSessions ?? null;
    }

    return this.prisma.member.create({
      data: {
        code: dto.code,
        fullName: dto.fullName,
        phone: dto.phone,
        photoUrl: dto.photoUrl,
        packageId: packageId,
        expireDate: calculatedExpireDate,
        remainingSessions: calculatedRemainingSessions,
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
      where: { id: Number(id) },
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

    if (dto.packageId) {
      const packageId = Number(dto.packageId);
      dataToUpdate.packageId = packageId;

      const pkg = await this.prisma.package.findUnique({
        where: { id: packageId },
      });
      if (!pkg) {
        throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນແພັກເກັດນີ້');
      }

      if (dto.remainingSessions === undefined) {
        dataToUpdate.remainingSessions = pkg.sessions ?? null;
      }
      if (!dto.expireDate && pkg.durationDays) {
        const now = new Date();
        const expire = new Date(now);
        expire.setDate(expire.getDate() + pkg.durationDays);
        dataToUpdate.expireDate = expire;
      }
    }

    if (dto.remainingSessions !== undefined && dto.remainingSessions !== null && (dto.remainingSessions as any) !== '') {
      dataToUpdate.remainingSessions = Number(dto.remainingSessions);
    }

    if (dto.expireDate) {
      dataToUpdate.expireDate = new Date(dto.expireDate);
    }

    return this.prisma.member.update({
      where: { id: Number(id) },
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

  // ⚡ 6. ລະບົບ Scan Check-in + Anti-Passback Logic (1 ນາທີ)
  async checkIn(dto: CheckInDto) {
    const member = await this.prisma.member.findUnique({
      where: { code: dto.code },
      include: { package: true },
    });

    if (!member) {
      throw new NotFoundException('ບໍ່ພົບລະຫັດບັດສະມາຊິກນີ້ໃນລະບົບ');
    }

    const now = new Date();

    // 🛑 [CHECK 1]: Anti-Passback Cooldown (1 ນາທີ)
    if (member.lastCheckIn) {
      const diffInMs = now.getTime() - member.lastCheckIn.getTime();
      const diffInMinutes = diffInMs / (1000 * 60);
      const COOLDOWN_MINUTES = 1;

      if (diffInMinutes < COOLDOWN_MINUTES) {
        const remainingMinutes = Math.ceil(COOLDOWN_MINUTES - diffInMinutes);
        throw new BadRequestException(
          `Anti-Passback: ສະມາຊິກເພິ່ງ Scan ເຂົ້າໄປ. ກະລຸນາລໍຖ້າອີກ ${remainingMinutes} ນາທີ ຈຶ່ງສາມາດ Scan ໄດ້ອີກຄັ້ງ`,
        );
      }
    }

    // 🛑 [CHECK 2]: ກວດສອບອາຍຸແພັກເກັດ
    if (member.expireDate && member.expireDate < now) {
      throw new BadRequestException('ແພັກເກັດສະມາຊິກຂອງທ່ານ ໝົດອາຍຸແລ້ວ!');
    }

    // 🔄 [PREPARE SESSIONS]: ຈັດການຄ່າ remainingSessions ໃຫ້ກົງກັບ Package ຖ້າມັນເປັນค่าว่าง
    let currentSessions = member.remainingSessions;
    if (currentSessions === null || currentSessions === undefined) {
      currentSessions = member.package?.sessions ?? null;
    }

    // 🛑 [CHECK 3]: ກວດສອບ ຈຳນວນຄັ້ງທີ່ເຫຼືອ (ຖ້າເປັນແພັກເກັດນັບຄັ້ງ)
    if (currentSessions !== null && currentSessions !== undefined) {
      if (currentSessions <= 0) {
        throw new BadRequestException('ຈຳນວນຄັ້ງໃນການເຂົ້າໃຊ້ງານຂອງທ່ານ ໝົດແລ້ວ!');
      }
    }

    // 🔄 [ACTION]: ອັບເດດຂໍ້ມູນການ Check-in ແລະ ຫັກຈຳນວນຄັ້ງລົງ 1
    const updateData: any = {
      lastCheckIn: now,
    };

    if (currentSessions !== null && currentSessions !== undefined) {
      updateData.remainingSessions = currentSessions - 1;
    }

    const updatedMember = await this.prisma.member.update({
      where: { id: member.id },
      data: updateData,
      include: { package: true },
    });

    // คำนวณจำนวนวันที่เหลือ (remainingDays) จาก expireDate
    let remainingDays: number | null = null;
    if (updatedMember.expireDate) {
      const diffInMs = updatedMember.expireDate.getTime() - now.getTime();
      remainingDays = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
    }

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
        remainingDays: remainingDays,
        expireDate: updatedMember.expireDate,
        lastCheckIn: updatedMember.lastCheckIn,
      },
    };
  }
}