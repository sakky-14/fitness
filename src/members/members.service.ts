import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CheckInDto } from './dto/check-in.dto';
import { createClient } from '@supabase/supabase-js'; // 👈 ເພີ່ມ Import Supabase Client

@Injectable()
export class MembersService {
  private supabase;

  constructor(private prisma: PrismaService) {
    // ດຶງຄ່າ Supabase URL & Key ຈາກ .env
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const bucketName = process.env.SUPABASE_BUCKET || 'images/members';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // 💡 Helper function: ສຳລັບລົບຮູບພາບออกจาก Supabase Storage Bucket 'members'
  private async deletePhotoFromStorage(photoUrl: string | null) {
    if (!photoUrl || !this.supabase) return;

    try {
      // ແຍກເອົາຊື່ຟາຍອອກຈາກ URL (ຕົວຢ່າງ: https://xxx.supabase.co/storage/v1/object/public/members/photo.jpg -> photo.jpg)
      const urlParts = photoUrl.split('images/members/');
      const fileName = urlParts.length > 1 ? urlParts[1] : photoUrl.split('/').pop();

      if (fileName) {
        const { error } = await this.supabase.storage
          .from('images/members')
          .remove([fileName]);

        if (error) {
          console.error(' Error deleting image from Supabase Storage:', error.message);
        }
      }
    } catch (err) {
      console.error(' Failed to delete image from storage:', err);
    }
  }

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

  // 4. ແກ້ໄຂຂໍ້ມູນສະມາຊິກ (ອັບເດດ/ລົບຮູບເກົ່າ)
  async update(id: number, dto: UpdateMemberDto) {
    const member = await this.findOne(id);

    // 🛑 ຖ້າມີການອັບເດດ photoUrl ໃໝ່ ຫຼື ສົ່ງເປັນ null (ລົບຮູບ) -> ລົບຮູບເກົ່າໃນ Supabase Storage
    if (dto.photoUrl !== undefined && dto.photoUrl !== member.photoUrl) {
      if (member.photoUrl) {
        await this.deletePhotoFromStorage(member.photoUrl);
      }
    }

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

  // 5. ລົບສະມາຊິກ (ລົບຮູບໃນ Storage ພ້ອມ)
  async remove(id: number) {
    const member = await this.findOne(id);

    // 🛑 ລົບຮູບຂອງສະມາຊິກออกจาก Supabase Storage ຖ້າມີຮູບ
    if (member.photoUrl) {
      await this.deletePhotoFromStorage(member.photoUrl);
    }

    return this.prisma.member.delete({
      where: { id: Number(id) },
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