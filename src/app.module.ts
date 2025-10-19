import { Module } from '@nestjs/common';
import { DescripcionesImagenesModule } from './descripciones-imagenes/descripciones-imagenes.module';

@Module({
  imports: [DescripcionesImagenesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
