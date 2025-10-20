import { Controller, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { CrearGroundTruthDto, CrearImagenDto } from './dto';
@Controller()
export class DescripcionesImagenesController {
  constructor(private readonly descripcionesImagenesService: DescripcionesImagenesService) {}

  //IMAGENES

  @MessagePattern({cmd:'uploadImageCloudinary'})
  async uploadImage(@Payload() payload: any){
    const base64 = payload?.bufferBase64;
    if (!base64) {
      throw new Error('No bufferBase64 in payload');
    }

    //TODO: MANEJAR EL ID DE USUARIO DE MANERA ADECUADA, ESTO ES SOLO PRUEBAS
    const idUsuario = payload?.idUsuario;

    const buffer = Buffer.from(base64, 'base64');

    const file = {
      fieldname: payload.fieldname || 'file',
      originalname: payload.originalname || 'upload.bin',
      encoding: payload.encoding || '7bit',
      mimetype: payload.mimetype || 'application/octet-stream',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;

    const imagen = await this.descripcionesImagenesService.uploadFile(file);
    const imagenPayload: CrearImagenDto = {
      imagenes: [
        {
          urlImagen: imagen.secure_url,
          fechaSubida: imagen.created_at,
          idCuidador: idUsuario,
          idAsset: imagen.asset_id,
          idPublicImage: imagen.public_id,
          formato: imagen.format
        }
      ]
    }

    return this.descripcionesImagenesService.create(imagenPayload);
  }


  @MessagePattern({cmd:'findAllDescripcionesImagenes'})
  findAll() {
    return "holaaaa";
  }

  //Buscar una imagen
  @MessagePattern({cmd:'buscarImagen'})
  buscarImagen(@Payload('id', ParseIntPipe) id: number) {
    return this.descripcionesImagenesService.buscarImagen(id);
  }

  @MessagePattern('updateDescripcionesImagene')
  update(@Payload() updateDescripcionesImageneDto: any) {
    return this.descripcionesImagenesService.update(updateDescripcionesImageneDto.id, updateDescripcionesImageneDto);
  }

  @MessagePattern('removeDescripcionesImagene')
  remove(@Payload() id: number) {
    return this.descripcionesImagenesService.remove(id);
  }


 
  //DESCRIPCION


  //GROUNDTRUH
  @MessagePattern({cmd:'crearGroundTruth'})
  crearGroundTruth(@Payload() groundTruthDto: CrearGroundTruthDto){
    return this.descripcionesImagenesService.crearGroundTruth(groundTruthDto);
  }

  //SESSIONS


  //PUNTAJE

}
