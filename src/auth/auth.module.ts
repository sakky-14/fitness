import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global() // 1. ເຮັດໃຫ້ AuthModule ເປັນ Global Module
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // 2. ກຳນົດ defaultStrategy
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModule, JwtModule], // 3. Export PassportModule ແລະ JwtModule ອອກໄປນຳ
})
export class AuthModule { }