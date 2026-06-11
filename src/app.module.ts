import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { EmployeeModule } from './employee/employee.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ManagerModule } from './manager/manager.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule,
    AdminModule,
    ManagerModule,
    EmployeeModule,
    SchedulerModule,
    HealthModule,
  ],
})
export class AppModule {}
