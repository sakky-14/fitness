import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordPTSessionDto {
  @IsNumber()
  @IsNotEmpty()
  memberId: number;

  @IsNumber()
  @IsNotEmpty()
  trainerId: number;

  @IsNumber()
  @IsOptional()
  memberPackageId?: number; // ແພັກເກັດ PT ທີ່ຕ້ອງການຕັດຊົ່ວໂມງ

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  hoursDeducted?: number = 1.0; // ຈຳນວນຊົ່ວໂມງທີ່ຕັດ ເຊັ່ນ: 1.0 ຫຼື 1.5

  @IsString()
  @IsOptional()
  sessionDate?: string;

  @IsString()
  @IsOptional()
  notes?: string; // ໝາຍເຫດ ເຊັ່ນ: Leg Day / Cardio training
}
