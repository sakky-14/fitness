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

  async login(dto: LoginDto) {
    // 1. ຄົ້ນຫາ User ຈາກเบอร์โทรศัพท์[cite: 1, 2]
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('ເບີໂທລະສັບ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 2. ກວດສອບ Password Hash[cite: 1, 2]
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('ເບີໂທລະສັບ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 3. ສ້າງ JWT Token
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
}