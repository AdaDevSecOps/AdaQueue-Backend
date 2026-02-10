
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowConfigService } from '../modules/workflow/workflow-config.service';
import { WorkflowEntity } from '../modules/workflow/entities/workflow.entity';
import { ProfileEntity } from '../modules/workflow/entities/profile.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function run() {
  const logger = new Logger('TestProfileSave');
  
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        envFilePath: 'apps/backend/.env',
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'mssql',
          host: configService.get<string>('DB_HOST'),
          port: parseInt(configService.get<string>('DB_PORT'), 10),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [WorkflowEntity, ProfileEntity],
          synchronize: false,
          options: {
            encrypt: false,
            trustServerCertificate: true,
          },
        }),
      }),
      TypeOrmModule.forFeature([WorkflowEntity, ProfileEntity]),
    ],
    providers: [WorkflowConfigService],
  }).compile();

  const service = module.get<WorkflowConfigService>(WorkflowConfigService);
  
  const testProfileCode = `PF-TEST-${Date.now()}`;
  const testProfileName = 'Test Profile Creation';
  const testConfig = {
    description: 'Created by test script',
    servicePoints: [],
    kiosks: [],
    displayBoards: []
  };
  const testAgnCode = 'AGN001';

  try {
    console.log(`Attempting to save profile: ${testProfileCode}`);
    // Calling the updated signature (removed workflowCode)
    const result = await service.saveProfile(testProfileCode, testProfileName, testConfig, testAgnCode);
    
    console.log('Save result:', JSON.stringify(result, null, 2));
    
    if (result && result.code === testProfileCode) {
        console.log('SUCCESS: Profile saved correctly.');
    } else {
        console.error('FAILURE: Profile not saved as expected.');
    }

  } catch (error) {
    console.error('ERROR during saveProfile:', error);
  } finally {
    await module.close();
  }
}

run();
