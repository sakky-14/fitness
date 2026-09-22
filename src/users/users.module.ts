import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export ไว้ให้ Auth หรือ Module อื่นใช้งานถ้าจำเป็น
})
export class UsersModule { }