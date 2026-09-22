import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateMemberDto {
    @IsString()
    @IsNotEmpty()
    code: string; // ລະຫັດບັດສະມາຊິກ / Barcode / QR Code

    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsOptional()
    photoUrl?: string;

    @IsInt()
    @IsOptional()
    packageId?: number;

    @IsDateString()
    @IsOptional()
    expireDate?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    remainingSessions?: number;
}