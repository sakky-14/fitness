import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePackageDto {
    @IsString()
    @IsNotEmpty()
    name: string; // ชื่อแพ็กเกจ เช่น "บุฟเฟต์ 1 เดือน", "คูปอง 10 ครั้ง"

    @IsNumber()
    @Min(0)
    priceLak: number; // ราคาเป็นเงินกีบ (Decimal)

    @IsInt()
    @IsOptional()
    @Min(1)
    durationDays?: number; // จำนวนวันใช้งาน (ถ้าเป็นรายวัน/รายเดือน)

    @IsInt()
    @IsOptional()
    @Min(1)
    sessions?: number; // จำนวนครั้งที่เข้าเล่นได้ (ถ้าเป็นคูปองนับครั้ง)
}