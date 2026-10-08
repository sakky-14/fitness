import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CheckInDto } from './dto/check-in.dto';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class MembersService {
  private supabase;
  private bucketName = process.env.SUPABASE_BUCKET || 'images';

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // 💡 Helper function: ສຳລັບລົບຮູບພາບออกจาก Supabase Storage Bucket 'images' (ໂຟນເດີ members)
  private async deletePhotoFromStorage(photoUrl: string | null) {
    if (!photoUrl) return;

    // 1. ລົບຮູບໃນ Supabase Storage
    if (this.supabase && photoUrl.includes('/storage/v1/object/public/')) {
      try {
        const urlParts = photoUrl.split(`/${this.bucketName}/`);
        if (urlParts.length > 1) {
          const filePathInBucket = urlParts[1]; // ຈະໄດ້ 'members/uuid.jpg'

          const { error } = await this.supabase.storage
            .from(this.bucketName)
            .remove([filePathInBucket]);

          if (error) {
            console.error('❌ Error deleting image from Supabase Storage:', error.message);
          } else {
            console.log(`✅ Successfully deleted image from Supabase Storage: ${filePathInBucket}`);
          }
        }
      } catch (err) {
        console.error('❌ Failed to delete image from Supabase storage:', err);
      }
    }

    // 2. ລົບຮູບໃນ Local Disk (ຖ້າມີ)
    if (photoUrl.startsWith('/uploads/members/')) {
      try {
        const localFileName = photoUrl.split('/uploads/members/')[1];
        const localPath = join('./uploads/members', localFileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (err) {
        console.error('❌ Failed to delete local image:', err);
      }
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

    if (member.expireDate && member.expireDate < now) {
      throw new BadRequestException('ແພັກເກັດສະມາຊິກຂອງທ່ານ ໝົດອາຍຸແລ້ວ!');
    }

    let currentSessions = member.remainingSessions;
    if (currentSessions === null || currentSessions === undefined) {
      currentSessions = member.package?.sessions ?? null;
    }

    if (currentSessions !== null && currentSessions !== undefined) {
      if (currentSessions <= 0) {
        throw new BadRequestException('ຈຳນວນຄັ້ງໃນການເຂົ້າໃຊ້ງານຂອງທ່ານ ໝົດແລ້ວ!');
      }
    }

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