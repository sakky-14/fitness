import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import "dotenv/config"
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  await app.listen(3000);
}
void bootstrap();
