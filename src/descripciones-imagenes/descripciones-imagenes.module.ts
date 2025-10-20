import { Module } from '@nestjs/common';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { DescripcionesImagenesController } from './descripciones-imagenes.controller';
import { CloudinaryProvider } from './imageProvider/cloudinary.provider';

@Module({
  controllers: [DescripcionesImagenesController],
  providers: [DescripcionesImagenesService, CloudinaryProvider],
  exports: [CloudinaryProvider]
})
export class DescripcionesImagenesModule {}
