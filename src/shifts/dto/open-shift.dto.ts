import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @IsNumber()
  @Min(0)
  startCashLak: number; // ເງິນສົດເລີ່ມຕົ້ນໃນລີ້ນຊັກ (LAK)

  @IsNumber()
  @IsOptional()
  @Min(0)
  startCashThb?: number = 0; // ເງິນສົດເລີ່ມຕົ້ນ (THB)

  @IsNumber()
  @IsOptional()
  @Min(0)
  startCashUsd?: number = 0; // ເງິນສົດເລີ່ມຕົ້ນ (USD)

  @IsString()
  @IsOptional()
  notes?: string;
}
