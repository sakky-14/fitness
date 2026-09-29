import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer'; // 👈 1. Import Type

export class CreateMemberDto {
    @IsString()
    @IsNotEmpty()
    code: string;

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
    @Type(() => Number) // 👈 2. ແປງ packageId ເປັນ Number
    packageId?: number;

    @IsDateString()
    @IsOptional()
    expireDate?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    @Type(() => Number) // 👈 3. ແປງ remainingSessions ເປັນ Number
    remainingSessions?: number;
}