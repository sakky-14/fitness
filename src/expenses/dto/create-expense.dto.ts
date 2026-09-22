import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Currency, ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
    @IsString()
    @IsNotEmpty()
    title: string; // หัวข้อรายการจ่าย เช่น "ซื้อน้ำดื่มเข้ายิม", "ค่าน้ำ-ค่าไฟ"

    @IsEnum(ExpenseCategory)
    @IsOptional()
    category?: ExpenseCategory; // SUPPLIES, UTILITIES, MAINTENANCE, MISCELLANEOUS (Default: SUPPLIES)

    @IsNumber()
    @Min(0)
    amountLak: number; // มูลค่ารวมเป็นเงินกีบ

    @IsEnum(Currency)
    @IsOptional()
    paidCurrency?: Currency; // LAK, THB, USD (Default: LAK)

    @IsNumber()
    @Min(0)
    @IsOptional()
    exchangeRate?: number; // อัตราแลกเปลี่ยน (Default: 1)

    @IsNumber()
    @Min(0)
    amountPaid: number; // จำนวนเงินที่จ่ายจริงตาม Currency

    @IsString()
    @IsOptional()
    receiptUrl?: string; // ลิงก์รูปถ่ายใบเสร็จ (ถ้ามี)
}