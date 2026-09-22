import { IsNotEmpty, IsString } from 'class-validator';

export class CheckInDto {
    @IsString()
    @IsNotEmpty()
    code: string; // ລະຫັດບັດສະມາຊິກ ທີ່ໄດ້ຈາກການ Scan Barcode / QR
}