import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { estado_sesion, PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './imageProvider/cloudinary-response';
import { ActualizarGroundTruthDto, ActualizarImagenDto, CrearDescriptionDto, CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, DescripcionPaginationDto, ImagenPaginationDto, SesionPaginationDto } from './dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { GoogleGenAI, Type} from '@google/genai'
import { envs, NATS_SERVICE } from 'src/config';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { SalidaConclusionSesionInterface,CrearPuntajeInterface, SalidaGeminiInterface, Usuario } from 'src/interfaces';
import { calcularDiferenciaHoraria } from './validationFunctions/hora-subida';
import { firstValueFrom } from 'rxjs';

const streamifier = require('streamifier')

const GEMINI_MODEL = 'gemini-2.5-flash';

@Injectable()
export class DescripcionesImagenesService extends PrismaClient implements OnModuleInit{
  private readonly logger = new Logger('DescImagesService');
  private readonly gemini: GoogleGenAI

  // Helper to normalize/parse date inputs and ensure we always send an explicit Date
  private parseDate(input?: string | Date | null): Date | undefined {
    // Treat null or undefined as absent
    if (input == null) return undefined;
    if (input instanceof Date) return input;
    // For numbers and strings, let JS parse them
    return new Date(input as any);
  }

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy){
    super();
    const geminiApiKey = envs.geminiApiKey;
    this.gemini = new GoogleGenAI({apiKey: geminiApiKey});
  }


  //----Conectar con la base de datos de supabase----
  async onModuleInit() {
      await this.$connect();
      this.logger.log('Database connected')
  }


  /*-------------------------------------------------------------------------*/
  /*---------------------------------IMÁGENES--------------------------------*/
  /*-------------------------------------------------------------------------*/

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


  /*FUNCIÓN PARA GUARDAR EN BASE DE DATOS LA IMAGEN*/

  async validaUsuarioId(id: string){
    
    const response = await firstValueFrom(
      this.client.send({ cmd: 'findUserById'},{id})
    );

    if (response.usuarios.length == 0) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Usuario no encontrado'
      });
    }
    return response.usuarios[0];
  }
  


  async create(crearImagenDto: CrearImagenDto) {
      const payload = crearImagenDto.imagenes[0];  
    try {
      return await this.iMAGEN.create({
        data:{
          urlImagen: payload.urlImagen,
          fechaSubida: this.parseDate((payload as any).fechaSubida) ?? new Date(),
          idCuidador: payload.idCuidador,
          idAsset: payload.idAsset,
          idPublicImage: payload.idPublicImage,
          idSesion: null,
          formato: payload.formato
        }
      })
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message
      })
    }
  }

  /* LISTAR IMÁGENES DE UN CUIDADOR*/

  async listarImagenesCuidador(imagenesPaginationDto: ImagenPaginationDto) {
    const usuario = await this.validaUsuarioId(imagenesPaginationDto.cuidadorId);
    if(!['cuidador', 'administrador'].includes(usuario.rol)){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "El id proporcionado no corresponde a un cuidador o a un administrador"
      })
    }

    const totalPages = await this.iMAGEN.count({
    where: {
      idCuidador: imagenesPaginationDto.cuidadorId 
    }
  })

    const currentPage = Number(imagenesPaginationDto.page);
    const perPage = Number(imagenesPaginationDto.limit);

    return {
      data: await this.iMAGEN.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          idCuidador: imagenesPaginationDto.cuidadorId
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }
  }

  /*BUSCAR IMAGEN*/

  //Buscar imágen por id
  async buscarImagen(id: number) {
    const imagen = await this.iMAGEN.findFirst({
      where: {
        idImagen: id
      },
      include:{
        GROUNDTRUTH:true
      }
    })  
    
    if(!imagen){
      throw new RpcException({
      status: HttpStatus.NOT_FOUND,
      message: "Imagen no encontrada"
      })
    }
    return imagen;
  }

  /* ELIMINAR IMAGEN */
  async eliminarImagen(id: number) {
    const imagen = await this.buscarImagen(id);

    // Si la imagen está asociada a una sesión, validar el estado de la sesión
    const sesionIdImagenActual = imagen.idSesion;
    if (sesionIdImagenActual != null) {
      const sesion = await this.buscarSesion(sesionIdImagenActual);
      if (sesion.estado == estado_sesion.completado) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "No es posible eliminar la imagen si la sesión en la que está ya fue completada"
        });
      }
    }

    // Si ya existe una descripción asociada a la imagen, impedir la eliminación
    const descripcionExistente = await this.dESCRIPCION.findFirst({
      where: { idImagen: id }
    });
    if (descripcionExistente) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'No es posible eliminar la imagen: ya existe una descripción asociada'
      });
    }

    const fechaSubida = imagen.fechaSubida;

    const result = calcularDiferenciaHoraria(fechaSubida);
    if (result.diffMs > result.HOURS_24_MS) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'No es posible eliminar la imagen: han pasado más de 24 horas desde la subida'
      });
    }

    await this.iMAGEN.delete({
      where:{
        idImagen: id
      }
    });
    return {
      message: "Imagen eliminada correctamente"
    };
  }

  /* ACTUALIZAR IMAGEN */
  async actualizarImagen(id:number, actualizarImagenDto:ActualizarImagenDto){
    const {idImagen:__, ...data} =actualizarImagenDto
    if(data.idSesion){
      const sesionLlegada = await this.buscarSesion(data.idSesion);
      const idSesionLlegada = sesionLlegada.idSesion;
      const imagen = await this.buscarImagen(id);
      const sesionIdImagenActual = imagen.idSesion;
      if(sesionLlegada.estado == estado_sesion.completado){
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "No es posible actualizar el id de sesión de una imágen a una sesión completada"
        })
      }
      if(sesionIdImagenActual != null){
        const sesion = await this.buscarSesion(sesionIdImagenActual);
        if(sesion.estado == estado_sesion.completado){
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: "No es posible actualizar el id de sesión de una imágen si la sesión en la que está ya fue completada"
          })
        }
      }
      const numeroImagenesConSesionLlegada = await this.iMAGEN.count({
        where: {
          idSesion: idSesionLlegada
        }
      })
      if(numeroImagenesConSesionLlegada == 3){
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "No es posible actualizar el id de sesión de una imágen a una sesión con 3 imágenes ya"
        })
      }

      try {
        return this.iMAGEN.update({
          where: {
            idImagen: id
          },
          data: data
        }) 
      } catch (error) {
        throw new RpcException(error);
      }
    }else{
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "Solo es posible actualizar la sesión de la imágen"
      })
    }
  }

  /*-------------------------------------------------------------------------*/
  /*------------------------------GROUNDTRUTH--------------------------------*/
  /*-------------------------------------------------------------------------*/

  /* FUNCIÓN PARA CREAR GROUNDTRUTH*/

  async crearGroundTruth(crearGroundTruthDto: CrearGroundTruthDto){
      //Verificar idImagen
      const idImagen = crearGroundTruthDto.idImagen;
      const imagen = await this.buscarImagen(idImagen);
      if(!imagen){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: "La imagen no existe en la base de datos"
        });
      }
      
      try {
        return await this.gROUNDTRUTH.create({
          data:{
            texto: crearGroundTruthDto.texto,
            fecha: this.parseDate((crearGroundTruthDto as any).fecha) ?? new Date(),
            idImagen: crearGroundTruthDto.idImagen,
            palabrasClave: crearGroundTruthDto.palabrasClave,
            preguntasGuiaPaciente: crearGroundTruthDto.preguntasGuiaPaciente
          }
        }) 
      } catch (error) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "Una imagen no puede tener más de una verdad absoluta"
        })
      }
  }

  /*FUNCIÓN PARA BUSCAR GROUNDTRUTH POR ID*/
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
      

      return gt;

  }

  /*FUNCIÓN PARA BUSCAR GROUNDTRUTH DADO EL ID DE UNA IMAGEN*/

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

  

  /*FUNCIÓN PARA ACTUALIZAR GROUNDTRUTH*/
  async actualizarGroundTruth(id: number, actualizarGroundTruthDto: ActualizarGroundTruthDto){
    const {id:__, ...data} = actualizarGroundTruthDto;
    const groundTruth = await this.buscarGroundTruth(id);
    const fechaSubida = groundTruth.fecha;
    const result = calcularDiferenciaHoraria(fechaSubida);
    if (result.diffMs > result.HOURS_24_MS) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'No es posible actualizar la descripción de verdad absoluta: han pasado más de 24 horas desde la subida'
      });
    }
    const descripcion = await this.dESCRIPCION.findFirst({
      where: {
        idImagen: groundTruth.idImagen
      }
    })
    if(descripcion){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "No puedes actualizar la verdad absoluta, ya el paciente describió la imágen"
      })
    }

    try {
      return this.gROUNDTRUTH.update({
        where: {
          idGroundtruth: id
        },
        data: data
      }) 
    } catch (error) {
      throw new RpcException(error);
    }
  }

  /*FUNCIÓN PARA ELIMINAR GROUNDTRUTH*/
  async eliminarGroundTruth(id: number){
   const groundTruth = await this.buscarGroundTruth(id);

    const fechaSubida = groundTruth.fecha;
    const result = calcularDiferenciaHoraria(fechaSubida);
    if (result.diffMs > result.HOURS_24_MS) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'No es posible eliminar la descripción de verdad absoluta: han pasado más de 24 horas desde la subida'
      });
    }
    const descripcion = await this.dESCRIPCION.findFirst({
      where: {
        idImagen: groundTruth.idImagen
      }
    })
    if(descripcion){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "No puedes eliminar la verdad absoluta, ya el paciente describió la imágen"
      })
    }

    await this.gROUNDTRUTH.delete({
      where:{
        idGroundtruth: id
      }
    });
    return {
      message: "Verdad absoluta eliminada correctamente"
    };
  }
 
  /*-------------------------------------------------------------------------*/
  /*---------------------------------SESIONES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  /* CREAR SESIÓN */
  async crearSesion(crearSesionDto: CrearSesionDto){
    try {
      const usuario = await this.validaUsuarioId(crearSesionDto.idCuidador);
      if(!['cuidador', 'administrador'].includes(usuario.rol)){
        throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'La persona que crea la sesión debe ser cuidador o administrador'})
      }
      const idCuidador = usuario.idUsuario;
      const pacienteCuidador = await firstValueFrom(this.client.send(
        {cmd:'pacienteCuidador'},
        {idCuidador}
      ));
      if(pacienteCuidador.length == 0){
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: "No hay un paciente asociado a este cuidador"
        })
      }
      if(crearSesionDto.imagenesIds.length > 3){
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "Solo es posible asociar 3 imágenes a una sesión"
        })
      }
      // Validar imágenes: existen, no tienen idSesion asignado y pertenecen al cuidador que crea la sesión
      if (Array.isArray(crearSesionDto.imagenesIds) && crearSesionDto.imagenesIds.length > 0) {
        await Promise.all(
          crearSesionDto.imagenesIds.map(async (imagenId) => {
            // buscarImagen lanzará RpcException si no existe
            const imagen = await this.buscarImagen(imagenId);
            // validar que la imagen no esté ya asignada a otra sesión
            if (imagen.idSesion) {
              throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: `La imagen ya está asignada a la sesión ${imagen.idSesion}`
              });
            }
            // validar que la imagen pertenezca al cuidador que está creando la sesión
            if (!imagen.idCuidador || imagen.idCuidador !== idCuidador) {
              throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: `La imagen no fue subida por el cuidador que intenta crear la sesión`
              });
            }
          })
        );
      }

      const sesion = await this.sESION.create({
        data:{
          idPaciente: pacienteCuidador[0].idPaciente,
          idCuidador: idCuidador,
          fechaCreacion: this.parseDate((crearSesionDto as any).fechaCreacion) ?? new Date(),
          ...((this.parseDate((crearSesionDto as any).fechaInicioPropuesta)) ? { fechaInicioPropuesta: this.parseDate((crearSesionDto as any).fechaInicioPropuesta) } : {}),
          sessionCoherencia: 0,
          sessionComision: 0,
          sessionOmision: 0,
          sessionRecall: 0,
          sessionTotal: 0,
          conclusionTecnica: "No se ha proporcionado todavía",
          conclusionNormal: "No se ha proporcionado todavía",
          fechaInicioPropuesta: crearSesionDto.fechaInicioPropuesta ?? null,
          activacion: false,
          notasMedico: "No hay notas aún",
          fechaRevisionMedico: null,
        }
      })
      // Asociar las imágenes a la sesión recién creada.
      // usar Promise.all para ejecutar actualizaciones en paralelo y asegurar que las llamadas async se ejecuten
      if (Array.isArray(crearSesionDto.imagenesIds) && crearSesionDto.imagenesIds.length > 0) {
        await Promise.all(
          crearSesionDto.imagenesIds.map(imagenId =>
            this.actualizarImagen(imagenId, { idImagen: imagenId, idSesion: sesion.idSesion })
          )
        );
      }

      return sesion;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message
      })
    }
  }

  /* CANTIDAD DE SESION POR PARCIENTE #*/
  async cantidadSesionesPaciente(idPaciente: string){
    const usuario = await this.validaUsuarioId(idPaciente);
    if ( !['paciente'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
    }

    const cantSesiones = await this.sESION.count({
      where: {
        idPaciente: idPaciente
      }
    })

    return {
      cantidad: cantSesiones
    };
  }

  /* TRAER SOLAMENTE EL BASELINE DEL PACIENTE, ES DECIR, LA PRIMERA SESIÓN */
  async baseline(idPaciente: string){
    const usuario = await this.validaUsuarioId(idPaciente);
    if ( !['paciente'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
    }
    const baseline = await this.sESION.findFirst({
      where: {
        idPaciente: idPaciente
      },
      orderBy: {
        fechaCreacion: 'asc'  // Ordenar por fecha de creación ascendente para obtener la primera sesión (baseline)
      },
      include: {
        IMAGEN: {
          select: {
            idImagen: true,
            idCuidador:true,
            urlImagen: true,
            fechaSubida: true,
            DESCRIPCION: {
              select:{
                texto: true,
                fecha: true
              }
            },
            GROUNDTRUTH: {
              select:{
                idGroundtruth: true,
                texto: true,
                fecha: true,
                palabrasClave: true,
                preguntasGuiaPaciente: true
              }
            }
          }
        }
      }
    })

    return baseline;
  }

  /* BUSCAR SESIONES DEL PACIENTE ESPECIFICAMENTE*/
  async listarSesiones(idPaciente:string, sesionPaginationDto: SesionPaginationDto){
    const {idPaciente:__, ...data} = sesionPaginationDto
    const usuario = await this.validaUsuarioId(idPaciente);
    if ( !['paciente'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
    }
    const totalPages = await this.sESION.count({
      where: {
        estado: data.estado_sesion,
        idPaciente: idPaciente
      }
    })

    const currentPage = Number(data.page);
    const perPage = Number(data.limit);

    return {
      data: await this.sESION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          estado: data.estado_sesion,
          idPaciente: idPaciente,
        },
        include: {
          IMAGEN: {
            select: {
              idImagen: true,
              idCuidador: true,
              urlImagen: true,
              fechaSubida: true,
              DESCRIPCION: {
                select:{
                  texto: true,
                  fecha: true
                }
              }
            }
          }
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }

  }

  async listarSesionesConGt(idPaciente:string, sesionPaginationDto: SesionPaginationDto){
    const {idPaciente:__, ...data} = sesionPaginationDto
    const usuario = await this.validaUsuarioId(idPaciente);
    if ( !['paciente'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
    }
    const totalPages = await this.sESION.count({
      where: {
        estado: data.estado_sesion,
        idPaciente: idPaciente
      }
    })

    const currentPage = Number(data.page);
    const perPage = Number(data.limit);

    return {
      data: await this.sESION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          estado: data.estado_sesion,
          idPaciente: idPaciente,
        },
        include: {
          IMAGEN: {
            select: {
              idImagen: true,
              idCuidador: true,
              urlImagen: true,
              fechaSubida: true,
              DESCRIPCION: {
                select:{
                  texto: true,
                  fecha: true
                }
              },
              GROUNDTRUTH: {
                select:{
                  idGroundtruth: true,
                  texto: true,
                  fecha: true,
                  palabrasClave: true,
                  preguntasGuiaPaciente: true
                }
              }
            }
          }
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }

  }

  /*LISTAR TODAS LAS SESIONES DE UN PACIENTE SIN PAGINACIÓN*/
  async listarSesionesPacienteCompletadas(idPaciente: string){
    //Validar id paciente
    const usuario = await this.validaUsuarioId(idPaciente);
    if ( !['paciente'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
    }
    try {
      const sesiones = await this.sESION.findMany({
        where: {
          idPaciente: idPaciente,
          estado: estado_sesion.completado
        }
      })
      return sesiones; 
    } catch (error) {
      throw new RpcException(error)
    }
  }

  /* LISTAR TODAS LAS SESIONES CREADAS POR UN CUIDADOR */
  async listarSesionesCuidador(idCuidador: string, sesionPaginationDto: SesionPaginationDto){
    // Validar que sea un cuidador
    const usuario = await this.validaUsuarioId(idCuidador);
    if (!['cuidador', 'administrador'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un cuidador o administrador'});
    }

    const totalPages = await this.sESION.count({
      where: {
        idCuidador: idCuidador,
        ...(sesionPaginationDto.estado_sesion && { estado: sesionPaginationDto.estado_sesion })
      }
    })

    const currentPage = Number(sesionPaginationDto.page);
    const perPage = Number(sesionPaginationDto.limit);

    return {
      data: await this.sESION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          idCuidador: idCuidador,
          ...(sesionPaginationDto.estado_sesion && { estado: sesionPaginationDto.estado_sesion })
        },
        include: {
          IMAGEN: {
            select: {
              idImagen: true,
              urlImagen: true,
              fechaSubida: true,
              idCuidador: true,
              DESCRIPCION: {
                select:{
                  texto: true,
                  fecha: true
                }
              },
              GROUNDTRUTH: {
                select:{
                  idGroundtruth: true,
                  texto: true,
                  fecha: true,
                  palabrasClave: true,
                  preguntasGuiaPaciente: true
                }
              }
            }
          }
        },
        orderBy: {
          fechaCreacion: 'desc'
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }
  }

  /* LISTAR SESIONES DE UN PACIENTE CREADAS POR UN CUIDADOR ESPECÍFICO */
  async listarSesionesPacientePorCuidador(idPaciente: string, idCuidador: string, sesionPaginationDto: SesionPaginationDto){
    // Validar id paciente
    const paciente = await this.validaUsuarioId(idPaciente);
    if (!['paciente'].includes(paciente.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
    }

    // Validar id cuidador
    const cuidador = await this.validaUsuarioId(idCuidador);
    if (!['cuidador', 'administrador'].includes(cuidador.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El idCuidador debe ser de un cuidador o administrador'});
    }

    const totalPages = await this.sESION.count({
      where: {
        idPaciente: idPaciente,
        idCuidador: idCuidador,
        ...(sesionPaginationDto.estado_sesion && { estado: sesionPaginationDto.estado_sesion })
      }
    })

    const currentPage = Number(sesionPaginationDto.page);
    const perPage = Number(sesionPaginationDto.limit);

    return {
      data: await this.sESION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          idPaciente: idPaciente,
          idCuidador: idCuidador,
          ...(sesionPaginationDto.estado_sesion && { estado: sesionPaginationDto.estado_sesion })
        },
        include: {
          IMAGEN: {
            select: {
              idImagen: true,
              urlImagen: true,
              fechaSubida: true,
              idCuidador: true,
              DESCRIPCION: {
                select:{
                  texto: true,
                  fecha: true
                }
              },
              GROUNDTRUTH: {
                select:{
                  idGroundtruth: true,
                  texto: true,
                  fecha: true,
                  palabrasClave: true,
                  preguntasGuiaPaciente: true
                }
              }
            }
          }
        },
        orderBy: {
          fechaCreacion: 'desc'
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }
  }


  /* BUSCAR SESIÓN POR ID*/
  async buscarSesion(id: number){
    const sesion = await this.sESION.findFirst({
      where: {
        idSesion: id
      },
      include: {
        IMAGEN: {
          select: {
            idImagen: true,
            idCuidador: true,
            urlImagen: true,
            fechaSubida: true,
            DESCRIPCION: true,
          }
        }
      }
    })
    if(!sesion){
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: "Sesión no encontrada en la base de datos"
      })
    }
    return sesion;
  }

  /* BUSCAR SESIÓN POR ID DE PACIENTE*/
  // async buscarSesionPaciente(id: string){
  //   const usuario = await this.validaUsuarioId(id);
  //   if ( !['paciente'].includes(usuario.rol)) {
  //     throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'El id debe ser de un paciente'});
  //   }
  //   const sesion = await this.sESION.findFirst({
  //     where: {
  //       idPaciente: id
  //     },
  //     include: {
  //       IMAGEN: {
  //         select: {
  //           urlImagen: true,
  //           fechaSubida: true,
  //           DESCRIPCION: true
  //         }
  //       }
  //     }
  //   })
  //   if(!sesion){
  //     throw new RpcException({
  //       status: HttpStatus.NOT_FOUND,
  //       message: "No hay una sesión asociada a este paciente"
  //     })
  //   }
  //   return sesion;
  // }


  /*ACTUALIZAR SESIÓN*/
  async actualizarSesion(id: number, actualizarSesionDto: ActualizarSesionDto){
      if(actualizarSesionDto.activacion == true || actualizarSesionDto.activacion == false || actualizarSesionDto.estado || actualizarSesionDto.fechaInicioPropuesta || actualizarSesionDto.notasMedico || actualizarSesionDto.fechaRevisionMedico){
      const {id:__, idCuidador, ...data} = actualizarSesionDto;

      const sesion = await this.buscarSesion(id);
      if(sesion.estado == estado_sesion.completado){
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "No es posible actualizar una sesión completada"
        })
      }

      // Validación de seguridad: Solo el cuidador que creó la sesión o un administrador puede actualizarla
      if (idCuidador) {
        const usuario = await this.validaUsuarioId(idCuidador);
        
        // Si es administrador, puede actualizar cualquier sesión
        if (usuario.rol === 'administrador') {
          // Permitir actualización
        } else if (usuario.rol === 'cuidador') {
          // Si es cuidador, solo puede actualizar sus propias sesiones
          if (sesion.idCuidador !== idCuidador) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message: "Solo el cuidador que creó la sesión puede actualizarla"
            })
          }
        } else {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: "Solo cuidadores y administradores pueden actualizar sesiones"
          })
        }
      }

      
      if (actualizarSesionDto.activacion === true || actualizarSesionDto.activacion === false) {
        const sesiones = await this.sESION.findMany({
          where: { idPaciente: sesion.idPaciente },
          select: { idSesion: true },
          orderBy: { fechaCreacion: 'asc' }  // Ordenar por fecha de creación para obtener número de sesión consistente
        });

        if (sesion.idPaciente == null) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Error con el id del paciente',
          });
        }

        
        const paciente = await this.validaUsuarioId(sesion.idPaciente);
        const index = sesiones.findIndex((s) => s.idSesion == sesion.idSesion);
        const numSesion = index >= 0 ? index + 1 : null;
        const cmd = actualizarSesionDto.activacion === true ? 'enviarActivacion' : 'enviarDesactivacion';

        this.client.emit({cmd:cmd}, {
          usuarioEmail: paciente.correo,
          nombreCompleto: paciente.nombre,
          sessionNumber: numSesion
        });
      }

      return this.sESION.update({
        where: {
          idSesion: id
        },
        data: data
      })
    }else{
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "Solo es posible actualizar los campos indicados"
      })
    }
  }


  async totalSesiones(){
    try {
      const totalSesiones = await this.sESION.count({})
      return {
        sesiones: totalSesiones
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message
      })
    }
  }

  /* AGREGAR NOTAS DEL MÉDICO A UNA SESIÓN */
  async agregarNotasMedico(idSesion: number, notasMedico: string) {
    try {
      // Verificar que la sesión existe
      const sesion = await this.buscarSesion(idSesion);

      // Validar que la sesión está completada
      if (sesion.estado !== estado_sesion.completado) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Solo se pueden agregar notas a sesiones completadas'
        });
      }

      // Actualizar notas y fecha de revisión
      const sesionActualizada = await this.sESION.update({
        where: { idSesion },
        data: {
          notasMedico,
          fechaRevisionMedico: new Date()
        }
      });

      return {
        ok: true,
        message: 'Notas del médico agregadas correctamente',
        sesion: sesionActualizada
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Error al agregar notas del médico'
      });
    }
  }

  /*-------------------------------------------------------------------------*/
  /*---------------------------------PUNTAJE---------------------------------*/
  /*-------------------------------------------------------------------------*/

  async crearPuntaje(crearPuntajeI: CrearPuntajeInterface){
    const idDescripcion = crearPuntajeI.idDescripcion;
    await this.buscarDescripcion(idDescripcion);

    try {
      const puntaje = await this.pUNTAJE.create({
      data: {
        idDescripcion: idDescripcion,
        rateOmision: crearPuntajeI.rateOmision,
        rateComision: crearPuntajeI.rateComision,
        rateExactitud: crearPuntajeI.rateExactitud,
        puntajeCoherencia: crearPuntajeI.puntajeCoherencia,
        puntajeFluidez: crearPuntajeI.puntajeFluidez,
        puntajeTotal: crearPuntajeI.puntajeTotal,
        fechaCalculo: this.parseDate((crearPuntajeI as any).fechaCalculo) ?? new Date(),
        detallesOmitidos: crearPuntajeI.detallesOmitidos,
        palabrasClaveOmitidas: crearPuntajeI.palabrasClaveOmitidas,
        aciertos: crearPuntajeI.aciertos,
        elementosComision: crearPuntajeI.elementosComision,
        conclusion: crearPuntajeI.conclusion
      }
    })

    return puntaje;

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error
      })  
    }
  }


  /*-------------------------------------------------------------------------*/
  /*---------------------------------DESCRIPCIÓN---------------------------------*/
  /*-------------------------------------------------------------------------*/

  async medicoDePaciente(idPaciente: string){
    try {
      const medico = await firstValueFrom(this.client.send({cmd:'pacienteMedico'},{idPaciente}))
      return medico;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "Error al traer el médico del paciente"
      })
    }
  }

  /* CREAR DESCRPCIÓN */
  async crearDescripcion(crearDescripcionDto: CrearDescriptionDto){

    //Validar idPaciente
    const idPaciente = crearDescripcionDto.idPaciente;
    const usuario = await this.validaUsuarioId(idPaciente);
    if ( !['paciente'].includes(usuario.rol)) {
      throw new RpcException({status: HttpStatus.BAD_REQUEST, message: 'La persona que describe una imagen debe ser un paciente'});
    }

    //Validación idImagen y buscar la sesión asociada a esa imagen
    const idImagen = crearDescripcionDto.idImagen;
    const imagen = await this.buscarImagen(idImagen);

    // Verificar que la imagen esté asociada a una sesión
    if (!imagen.idSesion) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "La imagen no está asociada a ninguna sesión"
      });
    }

    // Verificar que la imagen no haya sido descrita previamente
    const descripcionExistente = await this.dESCRIPCION.findFirst({
      where: { idImagen: idImagen }
    });

    if (descripcionExistente) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "Esta imagen ya ha sido descrita previamente"
      });
    }

    // Buscar la sesión asociada a la imagen (no cualquier sesión del paciente)
    const sesion = await this.buscarSesion(imagen.idSesion);
    const idSesion = sesion.idSesion;

    // Validar que el paciente que describe sea el mismo de la sesión
    if (sesion.idPaciente !== idPaciente) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "La imagen pertenece a una sesión de otro paciente"
      });
    }

    // Validamos estado sesion
    if (sesion.estado == estado_sesion.completado){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "No es posible realizar descripciones en sesiones completadas"
      })
    }

    //Numero de sesionesPaciente
    const numeroSesiones = await this.sESION.count({
      where: {
        idPaciente: idPaciente
      }
    })

    const descripcion = await this.dESCRIPCION.create({
    data: {
      texto: crearDescripcionDto.texto,
      fecha: this.parseDate((crearDescripcionDto as any).fecha) ?? new Date(),
      idPaciente: crearDescripcionDto.idPaciente,
      idImagen: crearDescripcionDto.idImagen,
    }
    })

    //Contamos las imagenes descritas
 
    const numeroDescripciones = await this.dESCRIPCION.count({
      where: { IMAGEN: { idSesion: idSesion } }
    });
    
    //Buscamos groundTruth
    const groundTruthDelaImagen = await this.gROUNDTRUTH.findFirst({
      where: {
        idImagen: idImagen
      }
    })
    if(!groundTruthDelaImagen){
      throw new RpcException({
        status: HttpStatus.CONFLICT,
        message: "No se pudo acceder al groundTruth de la imagen"
      })
    }

    //Generamos la comparativa
    const resultadoComparativa = await this.comparacionDescripcionGroundTruth(descripcion.idDescripcion, descripcion.texto, groundTruthDelaImagen.texto, groundTruthDelaImagen.palabrasClave)


    if(resultadoComparativa.puntajeTotal < 0.45){
      const medico = await this.medicoDePaciente(idPaciente);
      this.client.emit({cmd:'alertasEvaluarPuntaje'},{
        usuarioEmail: medico.correo,
        nombrePaciente: usuario.nombre,
        nombreDoctor: medico.nombre,
        puntaje: resultadoComparativa.puntajeTotal,
        sesion: numeroSesiones,
        umbralMinimo: 0.45
      })
    }


    //Verificamos que la descripcion que se acabó de subir sea la 3, en ese caso...
    if(numeroDescripciones == 3){
      //Llamado a la view de la base de datos
      let resultsSesion = await this.vW_PromediosPorSesion.findFirst({
        where: {
          idSesion: idSesion
        }
      });
      if(!resultsSesion){
        throw new RpcException({
          status: HttpStatus.BAD_GATEWAY,
          message: "Algo pasó al traer la vista de la base de datos"
        })
      }

      //Buscamos las conclusiones de los puntajes de las descripciones hechas en esa sesión
      const rows = await this.pUNTAJE.findMany({
        where:{
          DESCRIPCION:{
            IMAGEN: { idSesion: idSesion }
          }
        },
        select: {conclusion: true}
      });
      //Aplanamos la salida para que solo sea un arreglo de strings
      const conclusiones = rows.flatMap(r => r.conclusion ? [r.conclusion] : []); 
      //Crear el Dto para actualizar
      let sesionActualizar: ActualizarSesionDto = {
        id: idSesion,
        estado: estado_sesion.completado,
        sessionRecall: resultsSesion.PromedioExactitud ?? undefined,
        sessionComision: resultsSesion.PromedioComision ?? undefined,
        sessionOmision: resultsSesion.PromedioOmision ?? undefined,
        sessionCoherencia: resultsSesion.PromedioCoherencia ?? undefined, 
        sessionFluidez: resultsSesion.PromedioFluidez ?? undefined,
        sessionTotal: resultsSesion.PuntajeTotalPromedio ?? undefined,
      }
      //Pasamos los parámetros a la IA para que genere la conclusión
      const conclusionFinal = await this.generarConclusionSesionGemini(sesionActualizar, conclusiones);

      //Asignamos las conclusiones del DTO faltante
      sesionActualizar.conclusionTecnica = conclusionFinal.conclusionTecnica;
      sesionActualizar.conclusionNormal = conclusionFinal.conclusionNormal

      //Se llama a la función de actualizar ya existente
      await this.actualizarSesion(idSesion, sesionActualizar);


      //En caso de que la sesión sea el baseline...
      if(numeroSesiones == 1){
        const medico = await this.medicoDePaciente(idPaciente);
        this.client.emit({cmd:'generarAvisoBaseline'},{
          usuarioEmail: medico.correo,
          nombreDoctor: medico.nombre,
          nombrePaciente: usuario.nombre,
          sessionCoherencia: sesionActualizar.sessionCoherencia,
          sessionComision: sesionActualizar.sessionComision,
          sessionFluidez: sesionActualizar.sessionFluidez,
          sessionOmision: sesionActualizar.sessionOmision,
          sessionRecall: sesionActualizar.sessionRecall,
          sessionTotal: sesionActualizar.sessionTotal 
        })
      }

    }
    return {
      descripcion: descripcion,
      resultados: resultadoComparativa
    };
  }


  /*  BUSCAR DESCRIPCIÓN */
  async buscarDescripcion(id: number){
    const descripcion = await this.dESCRIPCION.findFirst({
      where:{
        idDescripcion: id
      },
      include:{
        PUNTAJE: true
      }
    })

    if(!descripcion){
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: "Descripcion no encontrada en la base de datos"
      })
    }

    return descripcion;
  }

  /* LISTAR DESCRIPCIONES DE UNA SESIÓN (LA SESIÓN YA ESTÁ ASOCIADA AL PACIENTE)*/
  async listarDescripciones(descripcionesPaginationDto: DescripcionPaginationDto){
    await this.buscarSesion(descripcionesPaginationDto.idSesion);

    const totalPages = await this.dESCRIPCION.count({
      where: {
        IMAGEN: { idSesion: descripcionesPaginationDto.idSesion }
      }
    })

    const currentPage = Number(descripcionesPaginationDto.page);
    const perPage = Number(descripcionesPaginationDto.limit);

    return {
      data: await this.dESCRIPCION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          IMAGEN: { idSesion: descripcionesPaginationDto.idSesion }
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }
    
  }


  /*------------- ------------------------------------------------------------*/
  /*--------------------------------GEMINI-AI--------------------------------*/
  /*-------------------------------------------------------------------------*/

  async comparacionDescripcionGroundTruth(idDescripcion: number, descripcionPaciente: string, groundTruth: string, palabrasClave: string[]): Promise<SalidaGeminiInterface>{
    const prompt = this.generarPromptComparacion(descripcionPaciente, groundTruth, palabrasClave);
    try {
      //CONSTRUCCIÓN DEL PROMPT Y PARÁMETROS
      const response = await this.gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config:{
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rateOmision: { type: Type.NUMBER },
              rateComision: { type: Type.NUMBER },
              rateExactitud: { type: Type.NUMBER },
              puntajeCoherencia: { type: Type.NUMBER },
              puntajeFluidez: { type: Type.NUMBER },
              puntajeTotal: { type: Type.NUMBER },
              detallesOmitidos: { type: Type.ARRAY, items: { type: Type.STRING } },
              palabrasClaveOmitidas: { type: Type.ARRAY, items: { type: Type.STRING } },
              elementosComision: {type: Type.ARRAY, items: { type: Type.STRING } },
              aciertos: { type: Type.ARRAY, items: { type: Type.STRING } },
              conclusion: { type: Type.STRING },
            },
            required: [
              "rateOmision",
              "rateComision",
              "rateExactitud",
              "puntajeCoherencia",
              "puntajeFluidez",
              "puntajeTotal",
              "detallesOmitidos",
              "palabrasClaveOmitidas",
              "elementosComision",
              "aciertos",
              "conclusion",
            ],
          },
        }
      })

      // Extraer y parsear la respuesta JSON
      const jsonResponse = response.text?.trim();
      if(!jsonResponse){
        throw new RpcException({
          status: HttpStatus.BAD_GATEWAY,
          message: "No hubo respuesta por parte de Gemini AI"          
        })
      }
      const result: SalidaGeminiInterface = JSON.parse(jsonResponse)
      
      //PERSISTENCIA EN BASE DE DATOS
      const puntaje: CrearPuntajeInterface = {
          idDescripcion: idDescripcion,
          rateOmision: result.rateOmision,
          rateComision: result.rateComision,
          rateExactitud: result.rateExactitud,
          puntajeCoherencia: result.puntajeCoherencia,
          puntajeFluidez: result.puntajeFluidez,
          puntajeTotal: result.puntajeTotal,
          detallesOmitidos: result.detallesOmitidos ?? [],
          palabrasClaveOmitidas: result.palabrasClaveOmitidas ?? [],
          elementosComision: result.elementosComision ?? [],
          aciertos: result.aciertos ?? [],
          conclusion: result.conclusion,
        } 
      await this.crearPuntaje(puntaje);
      
      return result;
    } catch (error) {
      this.logger.error('Error en la comparación con Gemini:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al procesar la solicitud con el modelo de IA.',
        details: error.message,
      });
    }
  }

  async generarConclusionSesionGemini(infoSesion: ActualizarSesionDto, conclusionesPuntajes: string[]): Promise<SalidaConclusionSesionInterface>{
    const prompt = this.generarPromptConclusionSesion(infoSesion, conclusionesPuntajes);
    try {
      //CONSTRUCCIÓN DEL PROMPT Y PARÁMETROS
      const response = await this.gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config:{
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conclusionTecnica: { type: Type.STRING },
              conclusionNormal: { type: Type.STRING },
            },
            required: [
              "conclusionTecnica",
              "conclusionNormal"
            ],
          },
        }
      })

      // Extraer y parsear la respuesta JSON
      const jsonResponse = response.text?.trim();
      if(!jsonResponse){
        throw new RpcException({
          status: HttpStatus.BAD_GATEWAY,
          message: "No hubo respuesta por parte de Gemini AI"          
        })
      }
      const result: SalidaConclusionSesionInterface = JSON.parse(jsonResponse)
      return result;
    }catch (error){
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al procesar la solicitud con el modelo de IA.',
        details: error.message,
      });
    } 
  }

  /*--------------------------------------------------------*/
  /*---FUNCIONES PRIVADAS PARA GENERAR LOS PROMPTS A LA IA--*/
  /*--------------------------------------------------------*/

  //TODO: MODIFICAR PARA QUE LA IA NO DEVUELVA NADA DE RENDIMIENTO EN EL MENSAJE AL PACIENTE

  private generarPromptComparacion(descripcionPaciente: string, groundTruth: string, palabrasClave: string[]){
    return `
    Eres un Analista Cognitivo Experto para una aplicación de detección de Alzheimer. Compara la Descripción del Paciente con el GroundTruth (referencia del cuidador) y devuelve solo los valores requeridos por el sistema, sin texto adicional.

    Entradas
    1) GroundTruth (descripción factual):
    ${groundTruth}

    2) Palabras clave del GroundTruth (arreglo; pueden incluir nombres, objetos, acciones y lugares):
    ${palabrasClave}

    3) DescripciónPaciente (relato libre del paciente):
    ${descripcionPaciente}

    Objetivo
    Evaluar memoria (recall) y narrativa del paciente con tolerancia semántica (sinónimos, lemas, variantes morfológicas), pero con estricta penalización al olvido (omisiones) y a las invenciones (comisiones).

    Normalización y correspondencias (interno)
    - Normaliza mayúsculas/minúsculas, tildes y lematiza.
    - Usa coincidencia semántica (sinónimos, hipónimos simples, perífrasis) para decidir si un elemento del GroundTruth está recordado (acierto) u omitido.
    - Distingue NÚCLEO vs. NO núcleo:
      • NÚCLEO: nombres propios, objetos/acciones principales, clima/lugar distintivos.  
      • NO núcleo: detalles secundarios.
    - Incertidumbre (“tal vez”, “no estoy seguro”, “no me acuerdo”, “parece que…”) se trata así:
      • En NÚCLEO: exactitud=0.0 y omisión=1.0 para ese elemento.  
      • En NO núcleo: exactitud=0.25 y omisión=0.75.
    - Si el paciente menciona elementos no presentes en el GroundTruth, son comisiones.
    - Prioriza ${palabrasClave}: las de tipo NÚCLEO pesan más tanto en omisión como en exactitud.

    Cálculo de métricas (0.00–1.00, dos decimales)
    1) rateOmision (promedio ponderado):
      - Pondera elementos: NÚCLEO=peso 2; NO núcleo=peso 1.
      - Para cada elemento: presente=0; incierto NÚCLEO=1.0 / NO núcleo=0.75; ausente=1.0.
      - Promedia ponderado y redondea.
    2) rateComision:
      - (# elementos falsos sustantivos mencionados) / (# menciones sustantivas totales del paciente). Redondea.
    3) rateExactitud (promedio ponderado):
      - NÚCLEO presente con equivalencia=1.0; incierto NÚCLEO=0.0; ausente=0.
      - NO núcleo presente=1.0; incierto NO núcleo=0.25; ausente=0.
      - Promedio ponderado (NÚCLEO=2, NO núcleo=1) y redondea.
    4) puntajeCoherencia: lógica, secuenciación y foco temático (no evalúa veracidad). Redondea.
    5) puntajeFluidez: naturalidad, gramática y continuidad. Redondea.

    Penalizaciones (interno)
    - penalIncertidumbre = 0.10 si aparece ≥1 de: “tal vez”, “no estoy seguro”, “no me acuerdo”.
    - penalBrevedad = 0.05 si <12 tokens o <2 oraciones; si <8 tokens: 0.10.
    - penalContradiccion = 0.05–0.10 si contradice explícitamente el GroundTruth.
    - Límite de penalizaciones: no sumar más de 0.20 (clamp a 0.20).

    Pesos (recall > narrativa)
    - memOmis = (1 - rateOmision)
    - memCom  = (1 - rateComision)
    - recallCore = 0.40*memOmis + 0.35*rateExactitud + 0.15*memCom
    - narrativa  = 0.04*puntajeCoherencia + 0.02*puntajeFluidez   ← máximo 0.06 del total
    - puntajeBruto = recallCore + narrativa
    - puntajePenal = puntajeBruto - (penalIncertidumbre + penalBrevedad + penalContradiccion)

    Caps (límites por cobertura de palabras clave y memoria)
    - kwRecall (ponderado NÚCLEO): (# palabrasClave NÚCLEO bien cubiertas con equivalencia / # palabrasClave NÚCLEO), con incierto=0.
      • Si kwRecall < 0.40 → puntajePenal = min(puntajePenal, 0.30)
      • Si 0.40 ≤ kwRecall < 0.60 → puntajePenal = min(puntajePenal, 0.40)
    - Cap adicional por mala memoria: si memOmis < 0.50 y rateExactitud < 0.50 → puntajePenal = min(puntajePenal, 0.40)

    Puntaje final
    - puntajeTotal = max(0.00, round(puntajePenal, 2))

    Listas cualitativas
    - detallesOmitidos: prioriza elementos NÚCLEO (personas con nombre, objetos/acciones principales, clima/lugar distintivos).
    - palabrasClaveOmitidas: reporta todas las NÚCLEO ausentes; las NÚCLEO inciertas también se listan como omitidas.
    - elementosComision: cada falso sustantivo (personas/objetos/acciones/lugares no existentes en el GroundTruth).
    - aciertos: solo elementos correctamente recordados; marca “incierto” únicamente en NO núcleo.

    Mensaje empático (dirigido al paciente):
    - Usa un tono cálido, amigable, positivo y motivador.  
    - Evita tecnicismos, juicios clínicos o lenguaje negativo. 
    - Debes darle ánimo al paciente para que siga con su proceso, no debes brindar ninguna retroalimentación de los resultados obtenidos.
    - Recordarle al paciente que es importante la constancia. En un tono agradable y amistoso.
    `;
  }

  private generarPromptConclusionSesion(infoSesion: ActualizarSesionDto, conclusionesPuntajes: string[]){
    return `
    Eres un Analista Cognitivo Experto. Debes redactar dos conclusiones de sesión después de que el paciente describió varias imágenes. Ya se calcularon los promedios de la sesión (0.0–1.0) y se adjuntan las conclusiones individuales de cada descripción.

    Datos de la sesión (0.0–1.0):
    - sessionRecall: ${infoSesion.sessionRecall}
    - sessionComision: ${infoSesion.sessionComision}
    - sessionOmision: ${infoSesion.sessionOmision}
    - sessionCoherencia: ${infoSesion.sessionCoherencia}
    - sessionFluidez: ${infoSesion.sessionFluidez}
    - sessionTotal: ${infoSesion.sessionTotal}

    Conclusiones de cada descripción (array):
    ${conclusionesPuntajes}

    Tu objetivo:
    1) ConclusionMedica (dirigida al médico):
      - Foco técnico y conciso.
      - Resume desempeño global y subcomponentes (recuerdo, comisiones, coherencia, fluidez).
      - Usa lenguaje objetivo (“evidencia de omisiones/comisiones”, “consistencia temática”, “fluidez”).
      - Señala fortalezas y áreas de alerta (sin diagnosticar).
      - Relaciona brevemente tendencias observadas en las conclusiones individuales (si aparecen patrones).
      - Evita recomendaciones terapéuticas específicas; sugiere “seguimiento” o “monitoreo” si procede.
      - Extensión orientativa: 90–300 palabras.

    2) ConclusionCuidador (dirigida al cuidador):
      - Tono cálido, positivo y motivador.
      - Menciona lo que el paciente hizo bien, lo mejorable en palabras simples y ofrece ánimo.
      - Evita tecnicismos, juicios o lenguaje negativo.
      - Mantén cercanía y respeto; evita la palabra “error”.
      - Extensión orientativa: 60–110 palabras.

    Criterios de interpretación (no los escribas, úsalos internamente):
    - Alto: ≥ 0.75, Medio: 0.45–0.74, Bajo: < 0.45.
    - sessionRecall alto y sessionComision bajo = buen recuerdo factual.
    - sessionCoherencia y sessionFluidez indican calidad narrativa.
    - sessionTotal es el resumen global.

    No incluyas explicaciones adicionales ni texto fuera de estos dos campos. No agregues JSON de esquema; únicamente el contenido de ambas conclusiones.
      `.trim();    
  }

  /**
   * Obtiene pacientes con sesiones activas y el conteo de sesiones
   */
  async obtenerPacientesConSesionesActivas() {
    try {
      const sesionesActivas = await this.sESION.groupBy({
        by: ['idPaciente'],
        where: {
          activacion: true,
          estado: {
            in: ['en_curso']
          },
          idPaciente: {
            not: null
          }
        },
        _count: {
          idSesion: true
        }
      });

      return {
        ok: true,
        pacientes: sesionesActivas.map(s => ({
          idPaciente: s.idPaciente,
          sesionesActivas: s._count.idSesion
        }))
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Error al buscar pacientes con sesiones activas',
      });
    }
  }
}
