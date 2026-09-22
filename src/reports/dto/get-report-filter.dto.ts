import { IsDateString, IsOptional } from 'class-validator';

export class GetReportFilterDto {
    @IsDateString()
    @IsOptional()
    startDate?: string; // ວັນທີເລີ່ມຕົ້ນ (YYYY-MM-DD)

    @IsDateString()
    @IsOptional()
    endDate?: string; // ວັນທີສຸດທ້າຍ (YYYY-MM-DD)
}