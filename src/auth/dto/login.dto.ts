import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    phone: string; // ໃຊ້เบอร์โทรศัพท์เป็น Username[cite: 1, 2]

    @IsString()
    @IsNotEmpty()
    password: string;
}