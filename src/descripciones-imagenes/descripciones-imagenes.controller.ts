import { Controller, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { CrearDescriptionDto, CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, SesionPaginationDto } from './dto';
import { GetAIresponseDto } from './dto/get-ai-response.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
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


/* 

*/  //
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


  /* ----------- GROUNDTRUH ----------- */
  
  //MessagePattern para crear groundtruth
  @MessagePattern({cmd:'crearGroundTruth'})
  crearGroundTruth(@Payload() groundTruthDto: CrearGroundTruthDto){
    return this.descripcionesImagenesService.crearGroundTruth(groundTruthDto);
  }

  @MessagePattern({cmd:'buscarGroundTruth'})
  buscarGroundTruth(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.buscarGroundTruth(id);
  }

  @MessagePattern({cmd:'buscarGroundTruthIdImagen'})
  buscarGroundTruthIdImagen(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.buscarGroundTruthIdImagen(id);
  }
  //SESSIONS

  //MessagePattern para crear la sesión
  @MessagePattern({cmd:'crearSesion'})
  crearSesion(@Payload() crearSesion: CrearSesionDto){
    return this.descripcionesImagenesService.crearSesion(crearSesion);
  }

  //MessagePattern para buscar sesiones
  @MessagePattern({cmd:'listarSesiones'})
  listarSesiones(@Payload() sesionPaginationDto: SesionPaginationDto){
    return this.descripcionesImagenesService.listarSesiones(sesionPaginationDto);
  }
  
  @MessagePattern({cmd: 'actualizarSesion'})
  actualizarSesion(@Payload() actualizarSesionDto: ActualizarSesionDto){
    return this.descripcionesImagenesService.actualizarSesion(actualizarSesionDto.id, actualizarSesionDto);
  }


  //PUNTAJE



  //------------ DESCR IPCION -------------

  @MessagePattern({cmd:'crearDescripcion'})
  crearDescripcion(@Payload() descripcionDto: CrearDescriptionDto){
    return this.descripcionesImagenesService.crearDescripcion(descripcionDto);
  }

  @MessagePattern({cmd:'geminiResponse'})
  geminiResponse(@Payload() aIResponseDto: GetAIresponseDto){
    return null
  }

}
