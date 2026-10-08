import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe,
  UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

const uploadDir = './uploads/products';

// ⚙️ Multer Options - ຕັ້ງຊື່ຟາຍເປັນ UUID
const multerOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  storage: diskStorage({
    destination: (req, file, callback) => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      callback(null, uploadDir);
    },
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

// 🎯 Bucket ຊື່ 'images' ແລະ Folder ຊື່ 'products'
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'images';
const FOLDER_NAME = 'products';

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

    // 🎯 Path ຈະເປັນ products/uuid.jpg
    const filePathInBucket = `${FOLDER_NAME}/${filename}`;

    let { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePathInBucket, fileData, {
        contentType,
        upsert: true,
      });

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

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePathInBucket);

    console.log('✅ Successfully uploaded product image to Supabase Storage:', publicUrlData.publicUrl);
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

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localPath = join(uploadDir, filename);
  fs.writeFileSync(localPath, dataBuffer);

  const supabasePublicUrl = await uploadFileToSupabase(dataBuffer, filename, contentType);

  return supabasePublicUrl || `/uploads/products/${filename}`;
}

// 👈 ຟັງຊັນຊ່ວຍອັບໂຫລດ Multipart File ໄປ Supabase Storage
async function processUploadedFile(file: Express.Multer.File): Promise<string> {
  const localUrl = `/uploads/products/${file.filename}`;
  if (!file) return localUrl;

  const contentType = file.mimetype || 'image/jpeg';
  const filePath = file.path || join(uploadDir, file.filename);

  const supabasePublicUrl = await uploadFileToSupabase(filePath, file.filename, contentType);
  return supabasePublicUrl || localUrl;
}

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createProductDto.imageUrl = await processUploadedFile(file);
    } else if (createProductDto.imageUrl) {
      createProductDto.imageUrl = await saveBase64Image(createProductDto.imageUrl);
    }
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.productsService.findAll({ search, category, isActive: activeBool });
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateProductDto.imageUrl = await processUploadedFile(file);
    } else if (updateProductDto.imageUrl) {
      updateProductDto.imageUrl = await saveBase64Image(updateProductDto.imageUrl);
    }
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}