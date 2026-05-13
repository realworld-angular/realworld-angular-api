import 'dotenv/config';
import * as path from 'path';
import { existsSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve assets/images/ directory directly at /images
  const imagesRoot = existsSync(path.join(process.cwd(), 'assets', 'images'))
    ? path.join(process.cwd(), 'assets', 'images')
    : path.join(__dirname, '..', 'assets', 'images');
  app.useStaticAssets(imagesRoot, { prefix: '/images' });

  // Cookie parser
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // Global validation pipe — strip unknown fields, transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — reflect origin (supports credentials across unrelated domains)
  app.enableCors({
    origin: true, // reflects the request origin back
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sliced API')
    .setDescription('REST API for the Sliced application')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🍕 Sliced API running on http://localhost:${port}/api`);
  console.log(`📄 Swagger UI available at http://localhost:${port}/api/docs`);
}

bootstrap();
