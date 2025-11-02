import { Module } from '@nestjs/common';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { DescripcionesImagenesController } from './descripciones-imagenes.controller';
import { CloudinaryProvider } from './imageProvider/cloudinary.provider';
import { NatsModule } from 'src/transports/nats.module';


@Module({
  controllers: [DescripcionesImagenesController],
  providers: [DescripcionesImagenesService, CloudinaryProvider],
  imports: [NatsModule],
  exports: [CloudinaryProvider]
})
export class DescripcionesImagenesModule {}
