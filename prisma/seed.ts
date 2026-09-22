import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
    // เข้ารหัสผ่านตั้งต้น (ตัวอย่าง: 123456) ด้วย bcrypt
    const saltRounds = 10;
    const defaultPassword = await bcrypt.hash('123456', saltRounds);

    // 1. สร้างบัญชี ADMIN (เจ้าของร้าน/ผู้จัดการ)[cite: 1]
    const adminUser = await prisma.user.upsert({
        where: { phone: '02055551111' }, // ใช้เบอร์โทรศัพท์เป็น unique identifier[cite: 1]
        update: {},
        create: {
            name: 'ผู้จัดการยิม',
            phone: '02055551111',
            passwordHash: defaultPassword,
            role: Role.ADMIN, // สิทธิ์ ADMIN สำหรับดูสรุปยอดเงิน[cite: 1]
        },
    });

    // 2. สร้างบัญชี STAFF (พนักงานเคาน์เตอร์)[cite: 1]
    const staffUser = await prisma.user.upsert({
        where: { phone: '02055552222' },
        update: {},
        create: {
            name: 'พนักงาน เคาน์เตอร์',
            phone: '02055552222',
            passwordHash: defaultPassword,
            role: Role.STAFF, // สิทธิ์ STAFF สำหรับทำรายการหน้าร้าน[cite: 1]
        },
    });

    console.log('สร้าง Seed Users สำเร็จ:', { adminUser, staffUser });
}

main()
    .catch((e) => {
        console.error('เกิดข้อผิดพลาดในการ Seed ข้อมูล:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });