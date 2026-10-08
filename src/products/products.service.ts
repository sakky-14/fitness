import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class ProductsService {
  private supabase;
  private bucketName = process.env.SUPABASE_BUCKET || 'images';

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://kxepuykhvqvjnooeoqcl.supabase.co';
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseKey && supabaseKey !== 'YOUR_SUPABASE_KEY') {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // 💡 Helper function: ສຳລັບລົບຮູບພາບออกจาก Supabase Storage Bucket 'images' (ໂຟນເດີ products)
  private async deletePhotoFromStorage(imageUrl: string | null) {
    if (!imageUrl) return;

    // 1. ລົບຮູບໃນ Supabase Storage
    if (this.supabase && imageUrl.includes('/storage/v1/object/public/')) {
      try {
        const urlParts = imageUrl.split(`/${this.bucketName}/`);
        if (urlParts.length > 1) {
          const filePathInBucket = urlParts[1]; // e.g. "products/550e8400-e29b-41d4-a716-446655440000.jpg"

          const { error } = await this.supabase.storage
            .from(this.bucketName)
            .remove([filePathInBucket]);

          if (error) {
            console.error('❌ Error deleting product image from Supabase Storage:', error.message);
          } else {
            console.log(`✅ Successfully deleted product image from Supabase Storage: ${filePathInBucket}`);
          }
        }
      } catch (err) {
        console.error('❌ Failed to delete product image from storage:', err);
      }
    }

    // 2. ລົບຮູບໃນ Local Disk (ຖ້າມີ)
    if (imageUrl.startsWith('/uploads/products/')) {
      try {
        const localFileName = imageUrl.split('/uploads/products/')[1];
        const localPath = join('./uploads/products', localFileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`✅ Deleted local product image: ${localPath}`);
        }
      } catch (err) {
        console.error('❌ Failed to delete local product image:', err);
      }
    }
  }

  // 1. ສ້າງສິນຄ້າໃໝ່
  async create(dto: CreateProductDto) {
    if (dto.barcode) {
      const existing = await this.prisma.product.findUnique({
        where: { barcode: dto.barcode },
      });
      if (existing) {
        throw new ConflictException('ລະຫັດບາໂຄ້ດສິນຄ້ານີ້ມີໃນລະບົບແລ້ວ (Barcode duplicate)');
      }
    }

    return this.prisma.product.create({
      data: {
        barcode: dto.barcode || null,
        name: dto.name,
        category: dto.category || null,
        costPriceLak: Number(dto.costPriceLak),
        priceLak: Number(dto.priceLak),
        stock: Number(dto.stock ?? 0),
        imageUrl: dto.imageUrl || null,
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
      },
    });
  }

  // 2. ດຶງລາຍການສິນຄ້າທັງໝົດ
  async findAll(query?: { search?: string; category?: string; isActive?: boolean }) {
    const where: any = {};
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.category) where.category = query.category;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. ດຶງຂໍ້ມູນສິນຄ້າຕາມ ID
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສິນຄ້ານີ້');
    return product;
  }

  // 4. ດຶງສິນຄ້າຕາມ Barcode
  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({ where: { barcode } });
    if (!product) throw new NotFoundException('ບໍ່ພົບສິນຄ້າຈາກບາໂຄ້ດນີ້');
    return product;
  }

  // 5. ແກ້ໄຂຂໍ້ມູນສິນຄ້າ
  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (dto.barcode) {
      const existing = await this.prisma.product.findUnique({ where: { barcode: dto.barcode } });
      if (existing && existing.id !== Number(id)) {
        throw new ConflictException('ລະຫັດບາໂຄ້ດສິນຄ້ານີ້ຖືກໃຊ້ງານໂດຍສິນຄ້າອື່ນແລ້ວ');
      }
    }

    // 🛑 ຖ້າມີການອັບເດດ imageUrl ໃໝ່ ຫຼື ສົ່ງ null/empty ເພື່ອລົບຮູບ -> ລົບຮູບເກົ່າໃນ Supabase Storage
    if (dto.imageUrl !== undefined && dto.imageUrl !== product.imageUrl) {
      if (product.imageUrl) {
        await this.deletePhotoFromStorage(product.imageUrl);
      }
    }

    const dataToUpdate: any = { ...dto };
    if (dto.costPriceLak !== undefined) dataToUpdate.costPriceLak = Number(dto.costPriceLak);
    if (dto.priceLak !== undefined) dataToUpdate.priceLak = Number(dto.priceLak);
    if (dto.stock !== undefined) dataToUpdate.stock = Number(dto.stock);
    if (dto.isActive !== undefined) dataToUpdate.isActive = Boolean(dto.isActive);

    return this.prisma.product.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });
  }

  // 6. ລົບສິນຄ້າ (ລົບຮູບໃນ Storage ພ້ອມ)
  async remove(id: number) {
    const product = await this.findOne(id);

    // 🛑 ລົບຮູບຂອງສິນຄ້າออกจาก Supabase Storage ຖ້າມີຮູບ
    if (product.imageUrl) {
      await this.deletePhotoFromStorage(product.imageUrl);
    }

    return this.prisma.product.delete({ where: { id: Number(id) } });
  }
}