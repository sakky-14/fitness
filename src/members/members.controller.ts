import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe,
  UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs'; // 👈 ເພີ່ມ fs ເພື່ອຈັດການຟາຍ
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CheckInDto } from './dto/check-in.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const uploadDir = './uploads/members';

const multerOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  storage: diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
      const uuid = crypto.randomUUID();
      const ext = extname(file.originalname);
      callback(null, `${uuid}${ext}`); // ໄດ້ຊື່: 123e4567-e89b-12d3-a456-426614174000.png
    },
  }),
};

// 👈 ຟັງຊັນຊ່ວຍแปลง Base64 Data URL ໃຫ້ເປັນຟາຍ UUID
function saveBase64Image(base64String: string): string {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String;
  }

  const matches = base64String.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,([\s\S]+)$/);
  if (!matches) return base64String;

  let ext = matches[1].toLowerCase();
  if (ext === 'jpeg') {
    ext = 'jpg';
  } else if (ext.includes('+')) {
    ext = ext.split('+')[0];
  }

  const base64Data = matches[2].replace(/\s/g, '');
  const dataBuffer = Buffer.from(base64Data, 'base64');
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${ext}`;

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(join(uploadDir, filename), dataBuffer);
  return `/uploads/members/${filename}`;
}

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
      // ຖ້າສົ່ງຟາຍມາແບບ multipart/form-data
      createMemberDto.photoUrl = `/uploads/members/${file.filename}`;
    } else if (createMemberDto.photoUrl) {
      // ຖ້າ Frontend ສົ່ງ Base64 string ມາທາງ JSON body
      createMemberDto.photoUrl = saveBase64Image(createMemberDto.photoUrl);
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
      // ຖ້າສົ່ງຟາຍມາແບບ multipart/form-data
      updateMemberDto.photoUrl = `/uploads/members/${file.filename}`;
    } else if (updateMemberDto.photoUrl) {
      // ຖ້າ Frontend ສົ່ງ Base64 string ມາທາງ JSON body
      updateMemberDto.photoUrl = saveBase64Image(updateMemberDto.photoUrl);
    }
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.remove(id);
  }
}