import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { RecordPTSessionDto } from './dto/record-pt-session.dto';
import { PTSessionStatus } from '@prisma/client';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) { }

  // 1. ສ້າງ Trainer ໃໝ່
  async create(dto: CreateTrainerDto) {
    const existing = await this.prisma.trainer.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('ເບີໂທລະສັບເທຣນເນີນີ້ມີໃນລະບົບແລ້ວ');
    }

    return this.prisma.trainer.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        specialty: dto.specialty,
        commissionRate: dto.commissionRate,
        userId: dto.userId || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  // 2. ດຶງລາຍຊື່ Trainer ທັງໝົດ
  async findAll() {
    return this.prisma.trainer.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
        _count: { select: { ptSessions: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  // 3. ດຶງ Trainer ຕາມ ID
  async findOne(id: number) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
        ptSessions: {
          take: 20,
          orderBy: { sessionDate: 'desc' },
          include: { member: { select: { id: true, fullName: true, code: true, phone: true } } },
        },
      },
    });

    if (!trainer) {
      throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນເທຣນເນີນີ້');
    }

    return trainer;
  }

  // 4. ແກ້ໄຂ Trainer
  async update(id: number, dto: UpdateTrainerDto) {
    await this.findOne(id);
    return this.prisma.trainer.update({
      where: { id },
      data: dto,
    });
  }

  // 5. ລົບ Trainer
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.trainer.delete({
      where: { id },
    });
  }

  // 6. ບັນທຶກການສອນ PT (Deduct PT Hours)
  async recordPTSession(dto: RecordPTSessionDto) {
    const hoursDeducted = Number(dto.hoursDeducted || 1.0);

    return this.prisma.$transaction(async (tx) => {
      // 1. ກວດສອບ Trainer
      const trainer = await tx.trainer.findUnique({
        where: { id: dto.trainerId },
      });
      if (!trainer || !trainer.isActive) {
        throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນເທຣນເນີ ຫຼື ເທຣນເນີບໍ່ໄດ້ເປີດໃຊ້ງານ');
      }

      // 2. ກວດສອບ Member
      const member = await tx.member.findUnique({
        where: { id: dto.memberId },
      });
      if (!member) {
        throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສະມາຊິກ');
      }

      // 3. ຄົ້ນຫາ MemberPackage ທີ່ມີຊົ່ວໂມງ PT
      let targetPackage = null;
      if (dto.memberPackageId) {
        targetPackage = await tx.memberPackage.findUnique({
          where: { id: dto.memberPackageId },
          include: { package: true },
        });
      } else {
        // ດຶງ Package PT ທຳອິດທີ່ຍັງມີຊົ່ວໂມງເຫຼືອ
        targetPackage = await tx.memberPackage.findFirst({
          where: {
            memberId: dto.memberId,
            isActive: true,
            remainingPtHours: { gte: hoursDeducted },
          },
          include: { package: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      let hourlyRateLak = 150000; // ຄ່າສອນເລີ່ມຕົ້ນຕໍ່ຊົ່ວໂມງ ຖ້າບໍ່ມີ Package ເຈາະຈົງ

      if (targetPackage) {
        const remaining = Number(targetPackage.remainingPtHours || 0);
        if (remaining < hoursDeducted) {
          throw new BadRequestException(
            `ຊົ່ວໂມງ PT ຂອງສະມາຊິກບໍ່ພຽງພໍ (ເຫຼືອ ${remaining} ຊົ່ວໂມງ, ຕ້ອງການຕັດ ${hoursDeducted} ຊົ່ວໂມງ)`,
          );
        }

        // ຕັດຊົ່ວໂມງ PT ອອກ
        await tx.memberPackage.update({
          where: { id: targetPackage.id },
          data: {
            remainingPtHours: {
              decrement: hoursDeducted,
            },
          },
        });

        if (targetPackage.package && Number(targetPackage.totalPtHours) > 0) {
          hourlyRateLak = Number(targetPackage.package.priceLak) / Number(targetPackage.totalPtHours);
        }
      }

      // ຄິດໄລ່ຄ່າ Commission: (ລາຄາຕໍ່ຊົ່ວໂມງ * ຈຳນວນຊົ່ວໂມງ) * (ອັດຕາ % / 100)
      const commissionRate = Number(trainer.commissionRate || 0);
      const totalSessionValue = hourlyRateLak * hoursDeducted;
      const commissionEarned = (totalSessionValue * commissionRate) / 100;

      // ສ້າງບັນທຶກ PTSession
      return tx.pTSession.create({
        data: {
          memberId: dto.memberId,
          trainerId: dto.trainerId,
          memberPackageId: targetPackage ? targetPackage.id : null,
          hoursDeducted,
          sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : new Date(),
          commissionEarned,
          status: PTSessionStatus.COMPLETED,
          notes: dto.notes,
        },
        include: {
          member: { select: { id: true, fullName: true, code: true, phone: true } },
          trainer: { select: { id: true, fullName: true, commissionRate: true } },
          memberPackage: { include: { package: { select: { name: true } } } },
        },
      });
    });
  }

  // 7. ດຶງປະຫວັດການສອນ PT (PT Sessions List)
  async getPTSessions(query?: { trainerId?: number; memberId?: number; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (query?.trainerId) where.trainerId = Number(query.trainerId);
    if (query?.memberId) where.memberId = Number(query.memberId);
    if (query?.startDate || query?.endDate) {
      where.sessionDate = {};
      if (query.startDate) where.sessionDate.gte = new Date(query.startDate);
      if (query.endDate) where.sessionDate.lte = new Date(query.endDate);
    }

    return this.prisma.pTSession.findMany({
      where,
      include: {
        trainer: { select: { id: true, fullName: true, phone: true, commissionRate: true } },
        member: { select: { id: true, fullName: true, code: true, phone: true } },
        memberPackage: { include: { package: { select: { name: true } } } },
      },
      orderBy: { sessionDate: 'desc' },
    });
  }

  // 8. ສະຫຼຸບຜົນງານ ແລະ ຄ່າຄອມມິດຊັ່ນຂອງເທຣນເນີ (Trainer Performance & Commission)
  async getTrainerPerformance(trainerId: number, startDate?: string, endDate?: string) {
    const trainer = await this.findOne(trainerId);

    const where: any = { trainerId };
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) where.sessionDate.lte = new Date(endDate);
    }

    const sessions = await this.prisma.pTSession.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
    });

    let totalHoursTaught = 0;
    let totalCommissionEarned = 0;

    for (const s of sessions) {
      totalHoursTaught += Number(s.hoursDeducted || 0);
      totalCommissionEarned += Number(s.commissionEarned || 0);
    }

    return {
      trainer: {
        id: trainer.id,
        fullName: trainer.fullName,
        phone: trainer.phone,
        specialty: trainer.specialty,
        commissionRate: trainer.commissionRate,
      },
      summary: {
        totalSessions: sessions.length,
        totalHoursTaught,
        totalCommissionEarned,
      },
      sessions,
    };
  }
}
