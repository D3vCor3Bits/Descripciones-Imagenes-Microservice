import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {envs} from './config';
import * as promClient from 'prom-client';

async function bootstrap() {
  const logger = new Logger('Descripciones-imagenes-MS');
  
  // ===== PROMETHEUS METRICS =====
  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });

  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });
  // ===== END PROMETHEUS =====

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers
      }
    }
  );
  
  app.useGlobalPipes(  
    new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
    }) 
  );

  await app.listen();
  logger.log(`Microservicio de descripciones e imagenes corriendo en PORT ${envs.port}`)
}
bootstrap();
