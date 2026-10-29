import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RestockProductDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number; // ຈຳນວນທີ່ນຳເຂົ້າສະຕັອກ

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitCostLak?: number; // ລາຄາຕົ້ນທຶນຕໍ່ໜ່ວຍຂອງລັອດນີ້

  @IsString()
  @IsOptional()
  supplier?: string; // ຊື່ຜູ້ສະໜອງສິນຄ້າ (Supplier)

  @IsString()
  @IsOptional()
  reference?: string; // ເລກທີໃບສັ່ງຊື້ (PO Number / Invoice Number)

  @IsString()
  @IsOptional()
  reason?: string; // ໝາຍເຫດ
}
