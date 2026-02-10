import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QueueModule } from './modules/queue/queue.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { AnalyticsController } from './modules/analytics/analytics.controller';
import { PerformanceModule } from './modules/performance/performance.module';
import { AuditService } from './modules/audit/audit.service';
import { EventService } from './modules/events/events.service';
import { KdsController } from './modules/integration/kds/kds.controller';
import { PosController } from './modules/integration/pos/pos.controller';
import { NotificationService } from './modules/notification/notification.service';
import { SequenceModule } from './modules/sequence/sequence.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT'), 10) || 1433,
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        options: {
          encrypt: false, // For local dev or if cert is not set up
          trustServerCertificate: true,
        },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    QueueModule,
    WorkflowModule,
    PerformanceModule,
    SequenceModule,
  ],
  controllers: [
    AnalyticsController,
    KdsController,
    PosController,
  ],
  providers: [
    AuditService,
    EventService,
    NotificationService,
  ],
})
export class AppModule {}
