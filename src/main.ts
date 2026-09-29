import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import "dotenv/config";
import { NestExpressApplication } from '@nestjs/platform-express'; // 👈 1. ເພີ່ມ Import ນີ້
import { join } from 'path'; // 👈 2. ເພີ່ມ Import ນີ້

async function bootstrap() {
  // 👈 3. ເພີ່ມ Type Generic <NestExpressApplication>
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors({
    origin: true, // สะท้อน origin ที่เรียกเข้ามาอัตโนมัติ รองรับทั้ง localhost และ production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
    credentials: true,
  });

  // 📂 4. ເພີ່ມບັນທັດນີ້ ເພື່ອໃຫ້ສາມາດດຶງຮູບພາບຜ່ານ URL ເຊັ່ນ: http://localhost:3000/uploads/members/... ໄດ້
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT || 3000);
}
void bootstrap();