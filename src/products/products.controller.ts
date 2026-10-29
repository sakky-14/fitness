import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe,
  UseInterceptors, UploadedFile, Request
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RestockProductDto } from './dto/restock-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

const uploadDir = './uploads/products';

// ⚙️ Multer Options - ໃຊ້ memoryStorage() ເພື່ອຮັບໄຟລ໌ເປັນ Buffer ແລ້ວຕັ້ງຊື່ຟາຍເປັນ UUID
const multerOptions = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  storage: memoryStorage(),
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

// ☁️ Helper: Upload Buffer ໄປຫາ Supabase Storage
async function uploadFileToSupabase(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string | null> {
  if (!supabase) {
    console.warn('⚠️ Supabase client is not initialized. Please set SUPABASE_KEY in .env file.');
    return null;
  }

  try {
    const filePathInBucket = `${FOLDER_NAME}/${filename}`;

    let { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePathInBucket, buffer, {
        contentType,
        upsert: true,
      });

    if (error && (error.message.includes('not found') || error.message.includes('Bucket'))) {
      console.log(`Bucket '${BUCKET_NAME}' not found. Creating bucket...`);
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
      const retry = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePathInBucket, buffer, {
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

    console.log('✅ Uploaded to Supabase with UUID filename:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Supabase upload exception:', err);
    return null;
  }
}

// 👈 ຟັງຊັນປະມວນຜົນ Uploaded File ໃຫ້ເປັນ UUID Filename 100%
async function processUploadedFile(file: Express.Multer.File): Promise<string> {
  const ext = extname(file.originalname) || '.jpg';
  const uuidFilename = `${crypto.randomUUID()}${ext}`;
  const contentType = file.mimetype || 'image/jpeg';

  const supabasePublicUrl = await uploadFileToSupabase(file.buffer, uuidFilename, contentType);
  if (supabasePublicUrl) {
    return supabasePublicUrl;
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localPath = join(uploadDir, uuidFilename);
  fs.writeFileSync(localPath, file.buffer);

  return `/uploads/products/${uuidFilename}`;
}

// 👈 ຟັງຊັນແປງ Base64 Data URL ເປັນ UUID Filename
async function saveBase64Image(base64String: string): Promise<string> {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String;
  }

  const matches = base64String.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,([\s\S]+)$/);
  if (!matches) return base64String;

  const rawType = matches[1].toLowerCase();
  const ext = rawType === 'jpeg' ? 'jpg' : rawType.includes('+') ? rawType.split('+')[0] : rawType;
  const contentType = `image/${rawType}`;

  const base64Data = matches[2].replace(/\s/g, '');
  const dataBuffer = Buffer.from(base64Data, 'base64');
  const uuidFilename = `${crypto.randomUUID()}.${ext}`;

  const supabasePublicUrl = await uploadFileToSupabase(dataBuffer, uuidFilename, contentType);
  if (supabasePublicUrl) {
    return supabasePublicUrl;
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localPath = join(uploadDir, uuidFilename);
  fs.writeFileSync(localPath, dataBuffer);

  return `/uploads/products/${uuidFilename}`;
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
    } else if (createProductDto.imageUrl && createProductDto.imageUrl.startsWith('data:image/')) {
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

  // ດຶງປະຫວັດ Stock Logs ທັງໝົດ
  @Get('stock-logs/all')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  getAllStockLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.productsService.getStockLogs(undefined, parsedLimit);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id/stock-logs')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  getProductStockLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.productsService.getStockLogs(id, parsedLimit);
  }

  // ສັ່ງຊື້ສິນຄ້າ / ເພີ່ມສະຕັອກ (Purchase Order / Restock)
  @Post(':id/restock')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  restock(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: RestockProductDto,
  ) {
    const staffId = req.user?.id || req.user?.sub;
    return this.productsService.restock(id, Number(staffId), dto);
  }

  // ປັບປຸງສະຕັອກ / ສິນຄ້າເສຍຫາຍ (Adjust Stock / Out Damage)
  @Post(':id/adjust-stock')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: AdjustStockDto,
  ) {
    const staffId = req.user?.id || req.user?.sub;
    return this.productsService.adjustStock(id, Number(staffId), dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.STAFF)
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateProductDto.imageUrl = await processUploadedFile(file);
    } else if (updateProductDto.imageUrl && updateProductDto.imageUrl.startsWith('data:image/')) {
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