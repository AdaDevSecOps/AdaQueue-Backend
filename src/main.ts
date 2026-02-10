import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Enable CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || '*',
  });

  const port = configService.get('PORT') || 3000;
  const prefix = configService.get('API_PREFIX') || 'api';
  const host = configService.get('HOST') || '0.0.0.0';
  
  app.setGlobalPrefix(prefix);

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AdaQueue API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, swaggerDoc);

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
