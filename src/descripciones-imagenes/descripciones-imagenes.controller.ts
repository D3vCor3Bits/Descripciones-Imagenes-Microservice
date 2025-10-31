import { Controller, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { ActualizarGroundTruthDto, CrearDescriptionDto, CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, DescripcionPaginationDto, ImagenPaginationDto, SesionPaginationDto } from './dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
@Controller()
export class DescripcionesImagenesController {
  constructor(private readonly descripcionesImagenesService: DescripcionesImagenesService) {}

  /*-------------------------------------------------------------------------*/
  /*---------------------------------IMÁGENES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  /*MessagePattern para subir la imagen*/

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

  /* BUSCAR IMAGEN */
  @MessagePattern({cmd:'buscarImagen'})
  buscarImagen(@Payload('id', ParseIntPipe) id: number) {
    return this.descripcionesImagenesService.buscarImagen(id);
  }

  /* LISTAR TODAS LAS IMÁGENES DE UN CUIDADOR: para mostrarle al usuario */
  @MessagePattern({cmd:'listarImagenes'})
  listarImagenes(@Payload() imagenPaginationDto: ImagenPaginationDto){
    return this.descripcionesImagenesService.listarImagenesCuidador(imagenPaginationDto);
  }


  @MessagePattern('updateDescripcionesImagene')
  update(@Payload() updateDescripcionesImageneDto: any) {
    return this.descripcionesImagenesService.update(updateDescripcionesImageneDto.id, updateDescripcionesImageneDto);
  }

  /*ELIMINAR IMAGEN*/
  @MessagePattern({cmd:'eliminarImagen'})
  eliminarImagen(@Payload('id', ParseIntPipe) id: number) {
    return this.descripcionesImagenesService.eliminarImagen(id);
  }


  /*-------------------------------------------------------------------------*/
  /*---------------------------------GROUNDTRUH--------------------------------*/
  /*-------------------------------------------------------------------------*/
  
  /* MESSAGEPATTERN PARA CREAR GROUNDTRUTH*/

  @MessagePattern({cmd:'crearGroundTruth'})
  crearGroundTruth(@Payload() groundTruthDto: CrearGroundTruthDto){
    return this.descripcionesImagenesService.crearGroundTruth(groundTruthDto);
  }

  /*BUSCAR GROUNDTRUTH*/

  @MessagePattern({cmd:'buscarGroundTruth'})
  buscarGroundTruth(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.buscarGroundTruth(id);
  }

  /*BUSCAR GROUNDTRUTH POR ID DE IMAGEN*/
  @MessagePattern({cmd:'buscarGroundTruthIdImagen'})
  buscarGroundTruthIdImagen(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.buscarGroundTruthIdImagen(id);
  }

  @MessagePattern({cmd:'actualizarGroundTruth'})
  actualizarGroundTruth(@Payload() actualizarGroundTruthDto: ActualizarGroundTruthDto){
    return this.descripcionesImagenesService.actualizarGroundTruth(actualizarGroundTruthDto.id, actualizarGroundTruthDto);
  }

  @MessagePattern({cmd:'eliminarGroundTruth'})
  eliminarGroundTruth(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.eliminarGroundTruth(id);
  }
  
  /*-------------------------------------------------------------------------*/
  /*---------------------------------SESIONES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  /* CREAR SESIÓN */
  @MessagePattern({cmd:'crearSesion'})
  crearSesion(@Payload() crearSesion: CrearSesionDto){
    return this.descripcionesImagenesService.crearSesion(crearSesion);
  }

  /* BUSCAR SESIÓN */
  @MessagePattern({cmd:'buscarSesion'})
  buscarSesion(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.buscarSesion(id);
  }

  /* LISTAR SESIONES */
  @MessagePattern({cmd:'listarSesiones'})
  listarSesiones(@Payload() sesionPaginationDto: SesionPaginationDto){
    return this.descripcionesImagenesService.listarSesiones(sesionPaginationDto.idPaciente, sesionPaginationDto);
  }
  
  /* ACTUALZIZAR SESIÓN*/
  @MessagePattern({cmd: 'actualizarSesion'})
  actualizarSesion(@Payload() actualizarSesionDto: ActualizarSesionDto){
    return this.descripcionesImagenesService.actualizarSesion(actualizarSesionDto.id, actualizarSesionDto);
  }

  /*-------------------------------------------------------------------------*/
  /*---------------------------------DESCRIPCIÓN--------------------------------*/
  /*-------------------------------------------------------------------------*/

  /* 
  CREAR DESCRIPCIÓN:
  Al crearla internamente se calcula el puntaje con relación al GT,
  se devuelven los puntajes y un mensaje de la IA. Indicando, de manera empática el desempeño
  */
  @MessagePattern({cmd:'crearDescripcion'})
  crearDescripcion(@Payload() descripcionDto: CrearDescriptionDto){
    return this.descripcionesImagenesService.crearDescripcion(descripcionDto);
  }

  /*BUSCAR DESCRIPCIÓN*/
  @MessagePattern({cmd:'buscarDescripcion'})
  buscarDescripcion(@Payload('id', ParseIntPipe) id: number){
    return this.descripcionesImagenesService.buscarDescripcion(id);
  }

  /* LISTAR DESCRIPCIONES DE UNA SEIÓN*/
  @MessagePattern({cmd:'listarDescripciones'})
  listarDescripciones(@Payload() descripcionesPaginationDto: DescripcionPaginationDto){
    return this.descripcionesImagenesService.listarDescripciones(descripcionesPaginationDto);
  }
}
