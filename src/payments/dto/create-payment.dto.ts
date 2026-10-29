import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Currency, PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt()
  @IsOptional()
  memberId?: number; // ID ສະມາຊິກ (ຖ້າເປັນ Walk-in ບໍ່ມີສະມາຊິກ ສາມາດປະຫວ່າງໄດ້)

  @IsInt()
  @IsOptional()
  packageId?: number; // ID ແພັກເກັດ ຖ້າມີການຊື້ ຫຼື ຕໍ່ອາຍຸ

  @IsInt()
  @IsOptional()
  productId?: number; // ID ສິນຄ້າ (ຖ້າມີການຊື້ເຄື່ອງດື່ມ/ອາຫານເສີມ)

  @IsInt()
  @IsOptional()
  shiftId?: number; // ID ຂອງກະເງິນສົດ (ຖ້າບໍ່ສົ່ງມາ ລະບົບຈະດຶງກະທີ່ເປີດຢູ່ອັດຕະໂນມັດ)

  @IsString()
  @IsNotEmpty()
  description: string; // ລາຍລະອຽດ ເຊັ່ນ: "ຕໍ່ອາຍຸສະມາຊິກລາຍເດືອນ", "ຊື້ເກເຕີເລດ 1 ຕຸກ"

  @IsNumber()
  @Min(0)
  amountLak: number; // ລາຄາລວມທີ່ຕ້ອງຈ່າຍເປັນເງິນກີບ

  @IsEnum(Currency)
  @IsOptional()
  paidCurrency?: Currency = Currency.LAK; // LAK, THB, USD

  @IsNumber()
  @Min(0)
  @IsOptional()
  exchangeRate?: number = 1; // ອັດຕາແລກປ່ຽນ (Default: 1)

  @IsNumber()
  @Min(0)
  amountPaid: number; // ຈຳນວນເງິນທີ່ລູກຄ້າຈ່າຍມາຕົວຈິງຕາມ Currency

  @IsNumber()
  @Min(0)
  @IsOptional()
  changeLak?: number = 0; // ເງິນທອນເປັນເງິນກີບ

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.CASH; // CASH, BCEL_ONE_QR, BANK_TRANSFER
}