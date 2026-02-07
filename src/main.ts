import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.enableCors();
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fund Raising Backend API')
    .setDescription('Comprehensive API for managing fundraising operations, child sponsorships, donations, contacts, and user management. Integrates with Salesforce CRM.')
    .setVersion('1.0.0')
    .setContact('Support', '', 'support@fundraising.app')
    .setLicense('UNLICENSED', '')
    .addBearerAuth()
    .addTag('Authentication', 'User login and signup endpoints')
    .addTag('Child', 'Child sponsorship management endpoints')
    .addTag('Contact', 'Contact management endpoints')
    .addTag('Donation', 'Donation management endpoints')
    .addTag('User', 'User management endpoints (admin)')
    .build();
    
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
  });
  
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(configService.get<string>('server.port') ?? 3000);
}
bootstrap();
