// import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';

// @Injectable()
// export class ProductsService {
//   constructor(private prisma: PrismaService) {}

//   // 1. ສ້າງสินค้าໃໝ່
//   async create(dto: CreateProductDto) {
//     if (dto.barcode) {
//       const existing = await this.prisma.product.findUnique({
//         where: { barcode: dto.barcode },
//       });
//       if (existing) {
//         throw new ConflictException('ລະຫັດບາໂຄ້ດสินค້ານີ້ມີໃນລະບົບແລ້ວ (Barcode duplicate)');
//       }
//     }

//     return this.prisma.product.create({
//       data: {
//         barcode: dto.barcode || null,
//         name: dto.name,
//         category: dto.category || null,
//         costPriceLak: dto.costPriceLak,
//         priceLak: dto.priceLak,
//         stock: dto.stock ?? 0,
//         imageUrl: dto.imageUrl || null,
//         isActive: dto.isActive ?? true,
//       },
//     });
//   }

//   // 2. ດຶງລາຍການสินค้าທັງໝົດ (ສະໜັບສະໜູນ Search ແລະ Filter)
//   async findAll(query?: { search?: string; category?: string; isActive?: boolean }) {
//     const where: any = {};

//     if (query?.isActive !== undefined) {
//       where.isActive = query.isActive;
//     }

//     if (query?.category) {
//       where.category = query.category;
//     }

//     if (query?.search) {
//       where.OR = [
//         { name: { contains: query.search, mode: 'insensitive' } },
//         { barcode: { contains: query.search, mode: 'insensitive' } },
//       ];
//     }

//     return this.prisma.product.findMany({
//       where,
//       orderBy: { createdAt: 'desc' },
//     });
//   }

//   // 3. ດຶງข้อมูลสินค้าຕາມ ID
//   async findOne(id: number) {
//     const product = await this.prisma.product.findUnique({
//       where: { id: Number(id) },
//     });

//     if (!product) {
//       throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນสินค້ານີ້');
//     }

//     return product;
//   }

//   // 4. ດຶງสินค้าຕາມ Barcode (ສໍາລັບ Scan ຂາຍໜ້າຮ້ານ)
//   async findByBarcode(barcode: string) {
//     const product = await this.prisma.product.findUnique({
//       where: { barcode },
//     });

//     if (!product) {
//       throw new NotFoundException('ບໍ່ພົບสินค้าຈາກບາໂຄ້ດນີ້');
//     }

//     return product;
//   }

//   // 5. ແກ້ໄຂຂໍ້ມູນสินค้า
//   async update(id: number, dto: UpdateProductDto) {
//     await this.findOne(id);

//     if (dto.barcode) {
//       const existing = await this.prisma.product.findUnique({
//         where: { barcode: dto.barcode },
//       });
//       if (existing && existing.id !== Number(id)) {
//         throw new ConflictException('ລະຫັດບາໂຄ້ດสินค້ານີ້ຖືກໃຊ້ງານໂດຍสินค้าອື່ນແລ້ວ');
//       }
//     }

//     return this.prisma.product.update({
//       where: { id: Number(id) },
//       data: dto,
//     });
//   }

//   // 6. ລົບสินค้า
//   async remove(id: number) {
//     await this.findOne(id);
//     return this.prisma.product.delete({
//       where: { id: Number(id) },
//     });
//   }
// }
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateProductDto, file?: Express.Multer.File) {
    if (dto.barcode) {
      const existing = await this.prisma.product.findUnique({
        where: { barcode: dto.barcode },
      });
      if (existing) {
        throw new ConflictException('ລະຫັດບາໂຄ້ດສິນຄ້ານີ້ມີໃນລະບົບແລ້ວ (Barcode duplicate)');
      }
    }

    // ຖ້າຫາກມີໄຟລ໌ສົ່ງມາ ໃຫ້ກຳນົດ path ຂອງ imageUrl ຕາມລະບົບ Members ຂອງທ່ານ
    let imageUrl = dto.imageUrl || null;
    if (file) {
      imageUrl = `/uploads/${file.filename}`; // ຫຼື path ຕາມທີ່ Members ໃຊ້
    }

    return this.prisma.product.create({
      data: {
        barcode: dto.barcode || null,
        name: dto.name,
        category: dto.category || null,
        costPriceLak: Number(dto.costPriceLak),
        priceLak: Number(dto.priceLak),
        stock: Number(dto.stock ?? 0),
        imageUrl: imageUrl,
        isActive: dto.isActive ?? true,
      },
    });
  }

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

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) throw new NotFoundException('ບໍ່ພົບຂໍ້ມູນສິນຄ້ານີ້');
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({ where: { barcode } });
    if (!product) throw new NotFoundException('ບໍ່ພົບສິນຄ້າຈາກບາໂຄ້ດນີ້');
    return product;
  }

  async update(id: number, dto: UpdateProductDto, file?: Express.Multer.File) {
    await this.findOne(id);

    if (dto.barcode) {
      const existing = await this.prisma.product.findUnique({ where: { barcode: dto.barcode } });
      if (existing && existing.id !== Number(id)) {
        throw new ConflictException('ລະຫັດບາໂຄ້ດສິນຄ້ານີ້ຖືກໃຊ້ງານໂດຍສິນຄ້າອື່ນແລ້ວ');
      }
    }

    const dataToUpdate: any = { ...dto };
    if (dto.costPriceLak) dataToUpdate.costPriceLak = Number(dto.costPriceLak);
    if (dto.priceLak) dataToUpdate.priceLak = Number(dto.priceLak);
    if (dto.stock !== undefined) dataToUpdate.stock = Number(dto.stock);

    if (file) {
      dataToUpdate.imageUrl = `/uploads/${file.filename}`;
    }

    return this.prisma.product.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id: Number(id) } });
  }
}
