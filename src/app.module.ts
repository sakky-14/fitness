import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PackagesModule } from './packages/packages.module';
import { MembersModule } from './members/members.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { ProductsModule } from './products/products.module';
import { ShiftsModule } from './shifts/shifts.module';
import { TrainersModule } from './trainers/trainers.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    PackagesModule,
    MembersModule,
    PaymentsModule,
    ExpensesModule,
    ReportsModule,
    ProductsModule,
    ShiftsModule,
    TrainersModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
