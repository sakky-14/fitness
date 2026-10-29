import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // 1. ຄົ້ນຫາ User ຈາກເບີໂທລະສັບ
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('ເບີໂທລະສັບ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 2. ກວດສອບ Password Hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('ເບີໂທລະສັບ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 3. ບັນທຶກ Login Audit Log
    try {
      await this.prisma.loginAuditLog.create({
        data: {
          userId: user.id,
          ipAddress: ipAddress || 'Unknown IP',
          userAgent: userAgent || 'Unknown Client',
        },
      });
    } catch (logErr) {
      console.error('Failed to create login audit log:', logErr);
    }

    // 4. ສ້າງ JWT Token
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  // ດຶງປະຫວັດການ Login (Audit Logs) ສຳລັບ ADMIN
  async getAuditLogs(limit = 100) {
    return this.prisma.loginAuditLog.findMany({
      take: limit,
      orderBy: { loginAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }
}