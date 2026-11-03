import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AppConfigModule } from './config/app-config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PatientsModule } from './modules/patients/patients.module.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { ClinicsModule } from './modules/clinics/clinics.module.js';
import { SpecializationsModule } from './modules/specializations/specializations.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module.js';
import { MedicalDocumentsModule } from './modules/medical-documents/medical-documents.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { PublicModule } from './modules/public/public.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    DoctorsModule,
    ClinicsModule,
    SpecializationsModule,
    ServicesModule,
    AppointmentsModule,
    MedicalRecordsModule,
    MedicalDocumentsModule,
    NotificationsModule,
    ReviewsModule,
    UploadsModule,
    AdminModule,
    PublicModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
