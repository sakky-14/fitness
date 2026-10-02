import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe,
  UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto'; // 👈 1. Import randomUUID ເຂົ້າມາ (Built-in ຂອງ Node.js)
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

// ⚙️ ຕັ້ງຄ່າ Multer + ໃຊ້ UUID ตั้งຊື່ໄຟລ໌
const multerOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  },
  storage: diskStorage({
    destination: './uploads/members',
    filename: (req, file, callback) => {
      const uuid = randomUUID(); // 👈 2. ສ້າງ UUID ເຊັ່ນ: "123e4567-e89b-12d3-a456-426614174000"
      const ext = extname(file.originalname);
      callback(null, `member-${uuid}${ext}`); // ຜົນລຶບຈະໄດ້: member-123e4567-e89b-12d3-a456-426614174000.jpg
    },
  }),
};

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) { }

  @Post('check-in')
  checkIn(@Body() checkInDto: CheckInDto) {
    return this.membersService.checkIn(checkInDto);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  create(
    @Body() createMemberDto: CreateMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createMemberDto.photoUrl = `/uploads/members/${file.filename}`;
    }
    return this.membersService.create(createMemberDto);
  }

  @Get()
  findAll() {
    return this.membersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateMemberDto.photoUrl = `/uploads/members/${file.filename}`;
    }
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.remove(id);
  }
}