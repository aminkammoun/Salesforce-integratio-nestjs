import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './modules/app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.enableCors();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('The Fund Raising App Api')
    .setDescription('The Fund Raising App API description')
    .setVersion('1.0')
    .addTag("API's")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);
  await app.listen(configService.get<string>('server.port') ?? 3000);
}
bootstrap();
