import { Module } from '@nestjs/common';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { DescripcionesImagenesController } from './descripciones-imagenes.controller';

@Module({
  controllers: [DescripcionesImagenesController],
  providers: [DescripcionesImagenesService],
})
export class DescripcionesImagenesModule {}
