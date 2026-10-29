import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @IsNumber()
  @Min(0)
  actualCashLak: number; // ເງິນສົດທີ່ນັບໄດ້ຕົວຈິງໃນລີ້ນຊັກ (LAK)

  @IsNumber()
  @IsOptional()
  @Min(0)
  actualCashThb?: number = 0; // ເງິນສົດທີ່ນັບໄດ້ຕົວຈິງ (THB)

  @IsNumber()
  @IsOptional()
  @Min(0)
  actualCashUsd?: number = 0; // ເງິນສົດທີ່ນັບໄດ້ຕົວຈິງ (USD)

  @IsString()
  @IsOptional()
  notes?: string; // ໝາຍເຫດ ເຊັ່ນ: ເງິນເກີນ ຫຼື ເງິນຂາດຍ້ອນຫຍັງ
}
