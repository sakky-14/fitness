import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'supersecretkey',
        });
    }

    async validate(payload: { sub: number; phone: string; role: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('ບໍ່ພົບຜູ້ໃຊ້ນີ້ໃນລະບົບ');
        }

        // Return ເອົາຂໍ້ມູນຜູ້ໃຊ້ໄປແປະໄວ້ໃນ req.user
        return { id: user.id, userId: user.id, phone: user.phone, role: user.role, name: user.name };
    }
}