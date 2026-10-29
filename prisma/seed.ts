import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Role, PackageType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash('123456', saltRounds);

  // 1. ADMIN (ຜູ້ຈັດການຍິມ)
  const adminUser = await prisma.user.upsert({
    where: { phone: '02055551111' },
    update: { role: Role.ADMIN },
    create: {
      name: 'ຜູ້ຈັດການຍິມ (Admin)',
      phone: '02055551111',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
    },
  });

  // 2. CASHIER (ແຄັດເຊຍ / ພະນັກງານໜ້າເຄົາເຕີ)
  const cashierUser = await prisma.user.upsert({
    where: { phone: '02055552222' },
    update: { role: Role.CASHIER },
    create: {
      name: 'ແຄັດເຊຍ ໜ້າເຄົາເຕີ',
      phone: '02055552222',
      passwordHash: defaultPassword,
      role: Role.CASHIER,
    },
  });

  // 3. TRAINER (ຄູຝຶກສອນສ່ວນຕົວ)
  const trainerUser = await prisma.user.upsert({
    where: { phone: '02055553333' },
    update: { role: Role.TRAINER },
    create: {
      name: 'ເທຣນເນີ ຕົ້ນ',
      phone: '02055553333',
      passwordHash: defaultPassword,
      role: Role.TRAINER,
    },
  });

  // 4. ສ້າງໂປຣໄຟລ໌ Trainer
  const trainerProfile = await prisma.trainer.upsert({
    where: { phone: '02055553333' },
    update: { userId: trainerUser.id },
    create: {
      userId: trainerUser.id,
      fullName: 'ເທຣນເນີ ຕົ້ນ (Master Trainer)',
      phone: '02055553333',
      specialty: 'Bodybuilding & Weight Loss',
      commissionRate: 20.0, // 20% commission
    },
  });

  // 5. Seed Packages ແຕ່ລະປະເພດ
  const samplePackages = [
    {
      name: 'ລາຍວັນທົ່ວໄປ (Day Pass)',
      type: PackageType.DAY_PASS,
      priceLak: 35000,
      durationDays: 1,
      durationHours: 24,
      sessions: 1,
    },
    {
      name: 'ສະມາຊິກລາຍເດືອນ (Monthly VIP)',
      type: PackageType.TIME_BASED,
      priceLak: 450000,
      durationDays: 30,
      sessions: null,
    },
    {
      name: 'ຄູປອງ 10 ຄັ້ງ (10 Sessions Coupon)',
      type: PackageType.SESSION_BASED,
      priceLak: 300000,
      durationDays: 60,
      sessions: 10,
    },
    {
      name: 'ຄອດສ໌ PT ສ່ວນຕົວ 10 ຊົ່ວໂມງ (PT Only)',
      type: PackageType.PT_ONLY,
      priceLak: 1500000,
      durationDays: 60,
      sessions: 10,
      ptHours: 10,
    },
  ];

  for (const pkg of samplePackages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      await prisma.package.create({ data: pkg });
    }
  }

  console.log('✅ Seed ຂໍ້ມູນເລີ່ມຕົ້ນສຳເລັດ:', {
    admin: adminUser.phone,
    cashier: cashierUser.phone,
    trainer: trainerUser.phone,
    trainerProfile: trainerProfile.fullName,
  });
}

main()
  .catch((e) => {
    console.error('❌ ເກີດຂໍ້ຜິດພາດໃນການ Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });