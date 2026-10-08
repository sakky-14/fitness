import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe,
  UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
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
      callback(null, `${uuid}${ext}`);
    },
  }),
};

// ☁️ Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://kxepuykhvqvjnooeoqcl.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

// 🎯 Bucket ຊື່ 'images' ແລະ Folder ຊື່ 'members'
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'images';
const FOLDER_NAME = 'members';

const supabase = (supabaseKey && supabaseKey !== 'YOUR_SUPABASE_KEY')
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ☁️ Helper: Upload image buffer or file path to Supabase Storage
async function uploadFileToSupabase(
  filePathOrBuffer: string | Buffer,
  filename: string,
  contentType: string,
): Promise<string | null> {
  if (!supabase) {
    console.warn('⚠️ Supabase client is not initialized. Please set SUPABASE_KEY in .env file.');
    return null;
  }

  try {
    const fileData = typeof filePathOrBuffer === 'string'
      ? fs.readFileSync(filePathOrBuffer)
      : filePathOrBuffer;

    // 🎯 ກຳນົດ Path ໃຫ້ເຂົ້າໄປ Folder 'members' ໃນ Bucket 'images' (ຕົວຢ່າງ: members/uuid.jpg)
    const filePathInBucket = `${FOLDER_NAME}/${filename}`;

    let { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePathInBucket, fileData, {
        contentType,
        upsert: true,
      });

    // ຖ້າບໍ່ມີ Bucket ເທື່ອ ໃຫ້ສ້າງ Bucket 'images'
    if (error && (error.message.includes('not found') || error.message.includes('Bucket'))) {
      console.log(`Bucket '${BUCKET_NAME}' not found. Creating bucket...`);
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
      const retry = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePathInBucket, fileData, {
          contentType,
          upsert: true,
        });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase Storage Upload Error:', error.message);
      return null;
    }

    // ດຶງ Public URL ຂອງຟາຍ
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePathInBucket);

    console.log('✅ Successfully uploaded to Supabase Storage:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Supabase upload exception:', err);
    return null;
  }
}

// 👈 ຟັງຊັນຊ່ວຍແປງ Base64 Data URL ໃຫ້ເປັນຟາຍ UUID ແລະ ອັບໂຫລດໄປ Supabase Storage
async function saveBase64Image(base64String: string): Promise<string> {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String;
  }

  const matches = base64String.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,([\s\S]+)$/);
  if (!matches) return base64String;

  const rawType = matches[1].toLowerCase();
  let ext = rawType === 'jpeg' ? 'jpg' : rawType.includes('+') ? rawType.split('+')[0] : rawType;
  const contentType = `image/${rawType}`;

  const base64Data = matches[2].replace(/\s/g, '');
  const dataBuffer = Buffer.from(base64Data, 'base64');
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${ext}`;

  // 1. ບັນທຶກລົງ Disk ທ້ອງຖິ່ນ (Backup/Temporary)
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localPath = join(uploadDir, filename);
  fs.writeFileSync(localPath, dataBuffer);

  // 2. ອັບໂຫລດໄປຍັງ Supabase Storage
  const supabasePublicUrl = await uploadFileToSupabase(dataBuffer, filename, contentType);

  return supabasePublicUrl || `/uploads/members/${filename}`;
}

// 👈 ຟັງຊັນຊ່ວຍອັບໂຫລດ Multipart File ໄປ Supabase Storage
async function processUploadedFile(file: Express.Multer.File): Promise<string> {
  const localUrl = `/uploads/members/${file.filename}`;
  if (!file) return localUrl;

  const contentType = file.mimetype || 'image/jpeg';
  const filePath = file.path || join(uploadDir, file.filename);

  const supabasePublicUrl = await uploadFileToSupabase(filePath, file.filename, contentType);
  return supabasePublicUrl || localUrl;
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
  async create(
    @Body() createMemberDto: CreateMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createMemberDto.photoUrl = await processUploadedFile(file);
    } else if (createMemberDto.photoUrl) {
      createMemberDto.photoUrl = await saveBase64Image(createMemberDto.photoUrl);
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateMemberDto.photoUrl = await processUploadedFile(file);
    } else if (updateMemberDto.photoUrl) {
      updateMemberDto.photoUrl = await saveBase64Image(updateMemberDto.photoUrl);
    }
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.membersService.remove(id);
  }
}