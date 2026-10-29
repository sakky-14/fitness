import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsBoolean } from 'class-validator';
import { PackageType } from '@prisma/client';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string; // ຊື່ແພັກເກັດ ເຊັ່ນ "ສະມາຊິກລາຍເດືອນ", "ຄູປອງ 10 ຄັ້ງ", "Day Pass", "PT 10 Sessions"

  @IsEnum(PackageType)
  @IsOptional()
  type?: PackageType = PackageType.TIME_BASED;

  @IsNumber()
  @Min(0)
  priceLak: number; // ລາຄາເປັນເງິນກີບ

  @IsInt()
  @IsOptional()
  @Min(1)
  durationDays?: number; // ຈຳນວນວັນໃຊ້ງານ (ສຳລັບ Time-based / Day Pass)

  @IsInt()
  @IsOptional()
  @Min(1)
  durationHours?: number; // ຈຳນວນຊົ່ວໂມງໃຊ້ງານ (ສຳລັບ Day Pass ເຊັ່ນ 2 ຊົ່ວໂມງ ຫຼື 24 ຊົ່ວໂມງ)

  @IsInt()
  @IsOptional()
  @Min(1)
  sessions?: number; // ຈຳນວນຄັ້ງທີ່ເຂົ້າຫຼິ້ນໄດ້ (ສຳລັບ Coupon / Session-based)

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  ptHours?: number; // ຈຳນວນຊົ່ວໂມງສອນ PT (ສຳລັບ PT_ONLY)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}