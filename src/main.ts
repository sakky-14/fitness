import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import "dotenv/config";
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express'; // 👈 Import ແປງ limit ຂະໜາດໄຟລ໌

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  // ⚙️ ເພີ່ມ Limit ຂະໜາດ Request Body ເປັນ 50MB (ປ້ອງກັນ Error 413)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
    credentials: true,
  });

  // 📂 ເປີດ Static Path ໃຫ້ເຂົ້າເຖິງໄຟລ໌ໃນໂຟເດີ້ uploads ຜ່ານ URL ໄດ້
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT || 3000);
}
void bootstrap();