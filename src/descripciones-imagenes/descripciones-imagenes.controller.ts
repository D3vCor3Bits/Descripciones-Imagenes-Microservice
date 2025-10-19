import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { CreateDescripcionesImageneDto } from './dto/create-descripciones-imagene.dto';
import { UpdateDescripcionesImageneDto } from './dto/update-descripciones-imagene.dto';

@Controller()
export class DescripcionesImagenesController {
  constructor(private readonly descripcionesImagenesService: DescripcionesImagenesService) {}

  @MessagePattern({cmd:'createDescripcionesImagene'})
  create(@Payload() createDescripcionesImageneDto: CreateDescripcionesImageneDto) {
    return "hola";
  }

  @MessagePattern('findAllDescripcionesImagenes')
  findAll() {
    return this.descripcionesImagenesService.findAll();
  }

  @MessagePattern('findOneDescripcionesImagene')
  findOne(@Payload() id: number) {
    return this.descripcionesImagenesService.findOne(id);
  }

  @MessagePattern('updateDescripcionesImagene')
  update(@Payload() updateDescripcionesImageneDto: UpdateDescripcionesImageneDto) {
    return this.descripcionesImagenesService.update(updateDescripcionesImageneDto.id, updateDescripcionesImageneDto);
  }

  @MessagePattern('removeDescripcionesImagene')
  remove(@Payload() id: number) {
    return this.descripcionesImagenesService.remove(id);
  }
}
