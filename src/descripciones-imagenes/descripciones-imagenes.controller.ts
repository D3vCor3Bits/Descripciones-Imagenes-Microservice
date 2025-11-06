import { Controller, HttpStatus, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { DescripcionesImagenesService } from './descripciones-imagenes.service';
import { ActualizarGroundTruthDto, ActualizarImagenDto, CrearDescriptionDto, CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, DescripcionPaginationDto, ImagenPaginationDto, SesionPaginationDto } from './dto';
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

    const response = await this.descripcionesImagenesService.validaUsuarioId(idUsuario);
    if (!response || !['cuidador', 'administrador'].includes(response.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'La persona que sube la imagen debe ser cuidador o administrador'});
    }

    const imagen = await this.descripcionesImagenesService.uploadFile(file)
    const imagenPayload: CrearImagenDto = {
      imagenes: [
        {
          urlImagen: imagen.secure_url,
          fechaSubida: imagen.created_at,
          idCuidador: idUsuario,
          idAsset: imagen.asset_id,
          idPublicImage: imagen.public_id,
          idSesion: null,
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


  @MessagePattern({cmd:'actualizarImagen'})
  actualizarImagen(@Payload() actualizarImagenDto: ActualizarImagenDto){
    return this.descripcionesImagenesService.actualizarImagen(actualizarImagenDto.idImagen, actualizarImagenDto);
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

  /* LISTAR SESIONES CON GT */
  @MessagePattern({cmd:'listarSesionesGt'})
  listarSesionesGt(@Payload() sesionPaginationDto: SesionPaginationDto){
    return this.descripcionesImagenesService.listarSesionesConGt(sesionPaginationDto.idPaciente, sesionPaginationDto);
  }
  
  /* LISTAR SESIONES SIN PAGINACIÓN */
  @MessagePattern({cmd:'listarSesionesCompletadas'})
  listarTodasSesiones(@Payload('idPaciente', ParseUUIDPipe) idPaciente:string){
    return this.descripcionesImagenesService.listarSesionesPacienteCompletadas(idPaciente);
  }

  /* ACTUALZIZAR SESIÓN*/
  @MessagePattern({cmd:'actualizarSesion'})
  actualizarSesion(@Payload() actualizarSesionDto: ActualizarSesionDto){
    return this.descripcionesImagenesService.actualizarSesion(actualizarSesionDto.id, actualizarSesionDto);
  }

  @MessagePattern({cmd:'cantidadSesiones'})
  cantidadSesiones(@Payload('idPaciente', ParseUUIDPipe) idPaciente: string){
    return this.descripcionesImagenesService.cantidadSesionesPaciente(idPaciente);
  }

  @MessagePattern({cmd:'baseline'})
  baselinePaciente(@Payload('idPaciente', ParseUUIDPipe) idPaciente: string){
    return this.descripcionesImagenesService.baseline(idPaciente);
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

  /* OBTENER PACIENTES CON SESIONES ACTIVAS */
  @MessagePattern({cmd:'obtenerPacientesConSesionesActivas'})
  obtenerPacientesConSesionesActivas(){
    return this.descripcionesImagenesService.obtenerPacientesConSesionesActivas();
  }
}
