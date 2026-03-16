import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('Starting migration to increase FTUsrPin column size...');
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  try {
    await queryRunner.query('ALTER TABLE TCNMUser ALTER COLUMN FTUsrPin NVARCHAR(100)');
    console.log('Successfully increased FTUsrPin column size to 100.');
  } catch (error) {
    console.error('Failed to alter column size:', error);
  } finally {
    await queryRunner.release();
  }

  await app.close();
}

bootstrap();
