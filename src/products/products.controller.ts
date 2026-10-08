// import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
// import { ProductsService } from './products.service';
// import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Role } from '@prisma/client';

// @Controller('products')
// @UseGuards(JwtAuthGuard, RolesGuard)
// export class ProductsController {
//   constructor(private readonly productsService: ProductsService) {}

//   @Post()
//   @Roles(Role.ADMIN)
//   create(@Body() createProductDto: CreateProductDto) {
//     return this.productsService.create(createProductDto);
//   }

//   @Get()
//   findAll(
//     @Query('search') search?: string,
//     @Query('category') category?: string,
//     @Query('isActive') isActive?: string,
//   ) {
//     const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
//     return this.productsService.findAll({ search, category, isActive: activeBool });
//   }

//   @Get('barcode/:barcode')
//   findByBarcode(@Param('barcode') barcode: string) {
//     return this.productsService.findByBarcode(barcode);
//   }

//   @Get(':id')
//   findOne(@Param('id', ParseIntPipe) id: number) {
//     return this.productsService.findOne(id);
//   }

//   @Patch(':id')
//   @Roles(Role.ADMIN)
//   update(
//     @Param('id', ParseIntPipe) id: number,
//     @Body() updateProductDto: UpdateProductDto,
//   ) {
//     return this.productsService.update(id, updateProductDto);
//   }

//   @Delete(':id')
//   @Roles(Role.ADMIN)
//   remove(@Param('id', ParseIntPipe) id: number) {
//     return this.productsService.remove(id);
//   }
// }
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image')) // 👈 ຮັບໄຟລ໌ຮູບຊື່ field ว่า 'image'
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.create(createProductDto, file);
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
  @UseInterceptors(FileInterceptor('image')) // 👈 ຮັບໄຟລ໌ຮູບຕອນແກ້ໄຂ
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.update(id, updateProductDto, file);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}

