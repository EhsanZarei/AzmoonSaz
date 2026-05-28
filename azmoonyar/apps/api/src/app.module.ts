import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Existing modules
import { AuthModule } from './modules/auth/auth.module';
// import { UsersModule } from './modules/users/users.module';
// import { OrganizationsModule } from './modules/organizations/organizations.module';
// import { ExamsModule } from './modules/exams/exams.module';
// import { QuestionsModule } from './modules/questions/questions.module';
// import { SubmissionsModule } from './modules/submissions/submissions.module';
// import { CertificatesModule } from './modules/certificates/certificates.module';
// import { ReportsModule } from './modules/reports/reports.module';
// import { PaymentsModule } from './modules/payments/payments.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// import { LiveQuizModule } from './modules/live-quiz/live-quiz.module';
// import { AiModule } from './modules/ai/ai.module';

// Infrastructure (To be implemented/configured)
// import { PrismaModule } from './prisma/prisma.module';
// import { RedisModule } from './redis/redis.module';
// import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
      { name: 'long', ttl: 3600000, limit: 1000 },
    ]),

    ScheduleModule.forRoot(),

    // PrismaModule,
    // RedisModule,
    // StorageModule,

    AuthModule,
    // UsersModule,
    // OrganizationsModule,
    // ExamsModule,
    // QuestionsModule,
    // SubmissionsModule,
    // CertificatesModule,
    // ReportsModule,
    // PaymentsModule,
    // NotificationsModule,
    // LiveQuizModule,
    // AiModule,
  ],
})
export class AppModule {}
