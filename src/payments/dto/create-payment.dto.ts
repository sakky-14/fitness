import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Currency, PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
    @IsInt()
    @IsOptional()
    memberId?: number; // ID ສະມາຊິກ (ຖ້າເປັນ Walk-in ບໍ່ມີສະມາຊິກ ສາມາດປະว่างไว้ได้)

    @IsInt()
    @IsOptional()
    packageId?: number; // ID ແພັກເກັດ ຖ້າມີການຊື້ ຫຼື ຕໍ່ອາຍຸ

    @IsInt()
    @IsOptional()
    productId?: number

    @IsString()
    @IsNotEmpty()
    description: string; // รายละเอียด เช่น "ต่ออายุบุฟเฟต์ 1 เดือน"

    @IsNumber()
    @Min(0)
    amountLak: number; // ราคารวมเป็นเงินกีบ

    @IsEnum(Currency)
    @IsOptional()
    paidCurrency?: Currency; // LAK, THB, USD (Default: LAK)

    @IsNumber()
    @Min(0)
    @IsOptional()
    exchangeRate?: number; // อัตราแลกเปลี่ยน (Default: 1)

    @IsNumber()
    @Min(0)
    amountPaid: number; // จำนวนเงินที่ลูกค้าจ่ายมาจริงตาม Currency

    @IsNumber()
    @Min(0)
    @IsOptional()
    changeLak?: number; // เงินทอนเป็นเงินกีบ

    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod; // CASH, BCEL_ONE_QR
}