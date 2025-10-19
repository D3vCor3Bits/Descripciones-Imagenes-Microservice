import { PartialType } from '@nestjs/mapped-types';
import { CreateDescripcionesImageneDto } from './create-descripciones-imagene.dto';

export class UpdateDescripcionesImageneDto extends PartialType(CreateDescripcionesImageneDto) {
  id: number;
}
