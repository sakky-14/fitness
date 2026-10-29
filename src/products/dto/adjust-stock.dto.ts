import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { StockLogType } from '@prisma/client';

export class AdjustStockDto {
  @IsEnum(StockLogType)
  @IsNotEmpty()
  type: StockLogType; // ADJUSTMENT ຫຼື OUT_DAMAGE

  @IsInt()
  @IsNotEmpty()
  quantity: number; // ຄ່າບວກ ຫຼື ຄ່າລົບ ເຊັ່ນ: -2 (ສິນຄ້າຊຳລຸດ) ຫຼື +5 (ນັບພົບເພີ່ມ)

  @IsString()
  @IsNotEmpty()
  reason: string; // ເຫດຜົນໃນການປັບປຸງສະຕັອກ (ບັງຄັບໃສ່ເພື່ອ Audit)
}
