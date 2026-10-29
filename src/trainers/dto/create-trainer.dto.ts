import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max, IsBoolean } from 'class-validator';

export class CreateTrainerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  specialty?: string; // e.g. "Bodybuilding", "Cardio & Weight Loss", "Functional Training"

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number; // e.g. 20 (หมายถึง 20%)

  @IsNumber()
  @IsOptional()
  userId?: number; // เชื่อมโยงกับ User Login (ถ้ามี)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
