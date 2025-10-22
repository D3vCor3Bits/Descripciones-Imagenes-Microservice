import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './imageProvider/cloudinary-response';
import { CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, SesionPaginationDto } from './dto';
import { RpcException } from '@nestjs/microservices';
const streamifier = require('streamifier')

@Injectable()
export class DescripcionesImagenesService extends PrismaClient implements OnModuleInit{
  private readonly logger = new Logger('DescImagesService');
  
  //Conectar con la base de datos de subase
  async onModuleInit() {
      await this.$connect();
      this.logger.log('Database connected')
  }


  /*Función para cargar el archivo a cloudinary
  vídeo de guía: https://www.youtube.com/watch?v=j6MlE50efCM
  */
  async uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse>{
    const buffer: Buffer | undefined = Buffer.isBuffer(file) ? file as unknown as Buffer : (file as any)?.buffer;
    if (!buffer) {
      return Promise.reject(new Error('No buffer provided to uploadFile'));
    }
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream =  cloudinary.uploader.upload_stream(
        (error, result) => {
          if(error) return reject(error);
          if (!result) return reject(new Error('No upload result from Cloudinary'));
          resolve(result);
        }
      );
      try {
        streamifier.createReadStream(buffer).pipe(uploadStream);
      } catch (err) {
        reject(err);
      }
    })
  }


  //Función para guardar en base de datos la imagen
  async create(crearImagenDto: CrearImagenDto) {
    try {
      const payload = crearImagenDto.imagenes[0];
      //TODO: REVISAR EL ID QUE EXISTA EN LA BASE DE DATOS DE USUARIOS POR MEDIO DE UN SEND
      
      return await this.iMAGEN.create({
        data:{
          urlImagen: payload.urlImagen,
          idCuidador: payload.idCuidador,
          idAsset: payload.idAsset,
          idPublicImage: payload.idPublicImage,
          formato: payload.formato
        }
      })
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error
      })
    }
  }

  //CON PAGINACIÓN
  findAll() {
    return `This action returns all descripcionesImagenes`;
  }

  //Buscar imágen por id
  async buscarImagen(id: number) {

      const imagen = await this.iMAGEN.findFirst({
        where: {
          idImagen: id
        }
      })

      if(!imagen){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: "Imagen no encontrada en la base de datos"
        })
      }

      return imagen;

  }

  update(id: number, updateDescripcionesImageneDto: any) {
    return `This action updates a #${id} descripcionesImagene`;
  }

  remove(id: number) {
    return `This action removes a #${id} descripcionesImagene`;
  }




  //DESCRIPCION


  //GROUNDTRUH
  async crearGroundTruth(crearGroundTruthDto: CrearGroundTruthDto){
      //TODO: Verificar idUsuario

      //Verificar idImagen
      const idImagen = crearGroundTruthDto.idImagen;
      const imagen = await this.buscarImagen(idImagen);
      if(!imagen){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: "La imagen no existe en la base de datos"
        });
      }
      
      return await this.gROUNDTRUTH.create({
        data:{
          texto: crearGroundTruthDto.texto,
          idCuidador: crearGroundTruthDto.idCuidador,
          idImagen: crearGroundTruthDto.idImagen
        }
      })
  }

  //Buscar GroundTruth por id
  async buscarGroundTruth(id: number){
      const idGt = id;
      const gt = await this.gROUNDTRUTH.findFirst({
        where: {
          idGroundtruth: idGt
        }
      })
      if(!gt){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: "Verdad absoluta no encontrada"
        })
      }
      console.log("GT: "+ gt)

      return gt;

  }

  //Buscar GroundTruth dado el id de una imágen
  async buscarGroundTruthIdImagen(id: number){
      const idImagen = id;
      const gt = await this.gROUNDTRUTH.findFirst({
        where: {
          idImagen: idImagen
        }
      })
      if(!gt){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: "Verdad absoluta no encontrada"
        })
      }

      return gt;
    }
  //TODO: Buscar groundtruths con paginación

  //Actualizar groudnTruth


  //Eliminar GroundTruth


  //-------------SESSIONS--------------

  //Crear sesión
  async crearSesion(crearSesionDto: CrearSesionDto){
    try {
      //Verificar existencia del idPaciente en la bd de usuarios
      const paciente = null; 
      //Validación del paciente
      //---

      const sesion = await this.sESION.create({
        data:{
          idPaciente: crearSesionDto.idPaciente,
          sessionCoherencia: 0,
          sessionComision: 0,
          sessionRecall: 0,
          sessionTotal: 0
        }
      })

      return sesion;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error
      })
    }
  }

  //Buscar sesiones
  async listarSesiones(sesionPaginationDto: SesionPaginationDto){
    return null;
  }


  //PUNTAJE

}
