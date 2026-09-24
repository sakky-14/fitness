import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import "dotenv/config"
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: true, // สะท้อน origin ที่เรียกเข้ามาอัตโนมัติ รองรับทั้ง localhost และ production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
    credentials: true,
  });
  await app.listen(3000);
}
void bootstrap();
