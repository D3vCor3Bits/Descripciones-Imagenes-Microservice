import { Injectable } from '@nestjs/common';
import { CreateDescripcionesImageneDto } from './dto/create-descripciones-imagene.dto';
import { UpdateDescripcionesImageneDto } from './dto/update-descripciones-imagene.dto';

@Injectable()
export class DescripcionesImagenesService {
  create(createDescripcionesImageneDto: CreateDescripcionesImageneDto) {
    return 'This action adds a new descripcionesImagene';
  }

  findAll() {
    return `This action returns all descripcionesImagenes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} descripcionesImagene`;
  }

  update(id: number, updateDescripcionesImageneDto: UpdateDescripcionesImageneDto) {
    return `This action updates a #${id} descripcionesImagene`;
  }

  remove(id: number) {
    return `This action removes a #${id} descripcionesImagene`;
  }
}
