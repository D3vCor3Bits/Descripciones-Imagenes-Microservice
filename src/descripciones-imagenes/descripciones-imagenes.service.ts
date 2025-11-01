import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { estado_sesion, PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './imageProvider/cloudinary-response';
import { ActualizarGroundTruthDto, CrearDescriptionDto, CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, DescripcionPaginationDto, ImagenPaginationDto, SesionPaginationDto } from './dto';
import { RpcException } from '@nestjs/microservices';
import { GoogleGenAI, Type} from '@google/genai'
import { envs } from 'src/config';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { SalidaConclusionSesionInterface,CrearPuntajeInterface, SalidaGeminiInterface } from 'src/interfaces';
import { calcularDiferenciaHoraria } from './validationFunctions/hora-subida';

const streamifier = require('streamifier')

const GEMINI_MODEL = 'gemini-2.5-flash';

@Injectable()
export class DescripcionesImagenesService extends PrismaClient implements OnModuleInit{
  private readonly logger = new Logger('DescImagesService');
  private readonly gemini: GoogleGenAI

  constructor(){
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

  /* LISTAR IMÁGENES DE UN CUIDADOR*/

  async listarImagenesCuidador(imagenesPaginationDto: ImagenPaginationDto) {
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

  //TODO: MIRAR SI SE HACE ACTUALIZAR IMAGEN
  update(id: number, updateDescripcionesImageneDto: any) {
    return `This action updates a #${id} descripcionesImagene`;
  }

  /* ELIMINAR IMAGEN */
  async eliminarImagen(id: number) {
    const imagen = await this.buscarImagen(id);

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



  /*-------------------------------------------------------------------------*/
  /*------------------------------GROUNDTRUTH--------------------------------*/
  /*-------------------------------------------------------------------------*/

  /* FUNCIÓN PARA CREAR GROUNDTRUTH*/

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
      
      try {
        return await this.gROUNDTRUTH.create({
          data:{
            texto: crearGroundTruthDto.texto,
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
      //Verificar existencia del idPaciente en la bd de usuarios
      const paciente = null; 
      //Validación del paciente
      //---

      const sesion = await this.sESION.create({
        data:{
          idPaciente: crearSesionDto.idPaciente,
          sessionCoherencia: 0,
          sessionComision: 0,
          sessionOmision: 0,
          sessionRecall: 0,
          sessionTotal: 0,
          conclusionTecnica: "No se ha proporcionado todavía",
          conclusionNormal: "No se ha proporcionado todavía"
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

  /* CANTIDAD DE SESION POR PARCIENTE #*/
  async cantidadSesionesPaciente(idPaciente: number){
    //Verificar paciente

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
  async baseline(idPaciente: number){

    const baseline = await this.sESION.findFirst({
      where: {
        idPaciente: idPaciente
      }
    })

    return baseline;
  }

  /* BUSCAR SESIONES DEL PACIENTE ESPECIFICAMENTE*/
  async listarSesiones(idPaciente:number, sesionPaginationDto: SesionPaginationDto){
    const {idPaciente:__, ...data} = sesionPaginationDto

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
          idPaciente: idPaciente
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
  async listarSesionesPaciente(idPaciente: number){
    //Validar id paciente
    console.log("ENTRE ACA")
    try {
      const sesiones = await this.sESION.findMany({
        where: {
          idPaciente: idPaciente
        }
      })
      return sesiones; 
    } catch (error) {
      throw new RpcException(error)
    }
  }


  /* BUSCAR SESIÓN POR ID*/
  async buscarSesion(id: number){
    const sesion = await this.sESION.findFirst({
      where: {
        idSesion: id
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
  async buscarSesionPaciente(id: number){
    const sesion = await this.sESION.findFirst({
      where: {
        idPaciente: id
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


  /*ACTUALIZAR SESIÓN*/
  async actualizarSesion(id: number, actualizarSesionDto: ActualizarSesionDto){
    const {id:__, ...data} = actualizarSesionDto;

    await this.buscarSesion(id);

    return this.sESION.update({
      where: {
        idSesion: id
      },
      data: data
    })
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
        detallesOmitidos: crearPuntajeI.detallesOmitidos,
        palabrasClaveOmitidas: crearPuntajeI.palabrasClaveOmitidas,
        aciertos: crearPuntajeI.aciertos,
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

  /* CREAR DESCRPCIÓN */
  async crearDescripcion(crearDescripcionDto: CrearDescriptionDto){

    //Validar idPaciente
    const idPaciente = crearDescripcionDto.idPaciente;

    //Validación idImagen
    const idImagen = crearDescripcionDto.idImagen;
    await this.buscarImagen(idImagen);

    //Validación idSesion
    const idSesion = crearDescripcionDto.idSesion;
    await this.buscarSesion(idSesion);
    const sesion = await this.buscarSesionPaciente(idPaciente);
    if(crearDescripcionDto.idSesion != sesion.idSesion){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "La sesión que está describiendo no está asociada al paciente indicado"
      })
    }


      //Validamos estado  sesion
      if (sesion.estado == estado_sesion.completado){
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: "No es posible realizar descripciones en sesiones completadas"
        })
      }
      const descripcion = await this.dESCRIPCION.create({
      data: {
        texto: crearDescripcionDto.texto,
        idPaciente: crearDescripcionDto.idPaciente,
        idImagen: crearDescripcionDto.idImagen,
        idSesion: crearDescripcionDto.idSesion,
      }
    })

    const numeroDescripciones = await this.dESCRIPCION.count({
      where:{
        idSesion: idSesion
      }
    })
    
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
            idSesion:idSesion,
          },
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
        idSesion: descripcionesPaginationDto.idSesion
      }
    })

    const currentPage = Number(descripcionesPaginationDto.page);
    const perPage = Number(descripcionesPaginationDto.limit);

    return {
      data: await this.dESCRIPCION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          idSesion: descripcionesPaginationDto.idSesion
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }
    
  }


  /*-------------------------------------------------------------------------*/
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

      //MANEJAR ALERTAS EN CASO DE QUE UN VALOR O VALORES SEAN MALOS
      
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

  private generarPromptComparacion(descripcionPaciente: string, groundTruth: string, palabrasClave: string[]){
    return `
    Eres un Analista Cognitivo Experto para una aplicación de detección de Alzheimer. Tu función es comparar el texto de la Descripción del Paciente con el texto de Referencia del Cuidador (Ground Truth) para evaluar el rendimiento cognitivo.
    
    1. GroundTruth: descripción factual escrita por el cuidador sobre una fotografía.
    ${groundTruth}
      
      Palabras clave del GroundTruth (arreglo):
      ${palabrasClave}
    
    2. DescripciónPaciente: relato libre del paciente sobre la misma fotografía.
    ${descripcionPaciente}

    Tu tarea es comparar ambos textos y generar una evaluación cognitiva y lingüística del paciente, devolviendo únicamente los valores requeridos por el sistema (numéricos de 0.0 a 1.0 y listas de palabras/frases), sin ningún texto adicional fuera de la respuesta estructurada.

    Realiza los siguientes pasos internamente:

    1. Comprende el contenido de ambos textos.
      Identifica las personas, objetos, lugares y acciones principales presentes en el GroundTruth.
      Realiza esta misma tarea con la descripción del paciente.

    2. Evalúa la memoria (Memory Recall):
      - Detecta omisiones: elementos del GroundTruth que el paciente no mencionó.
      - Detecta comisiones: elementos falsos o inexistentes agregados por el paciente.
      - Calcula la exactitud: proporción de coincidencias semánticas entre ambas descripciones; es importante que uses tolerancia a sinónimos y expresiones similares.
      - Asigna:
        - rateOmision: 0.0 (sin omisiones) a 1.0 (olvidó todo).
        - rateComision: 0.0 (sin falsos) a 1.0 (muchos falsos).
        - rateExactitud: 0.0 (ninguna coincidencia) a 1.0 (todas correctas).

    3. Evalúa la coherencia y fluidez narrativa (Narrative Coherence):
      - Determina si la historia del paciente tiene lógica, secuencia y consistencia temática.
      - Evalúa la complejidad y naturalidad lingüística (vocabulario, estructura gramatical, fluidez).
      - Asigna:
        - puntajeCoherencia: 0.0 (incoherente) a 1.0 (muy coherente).
        - puntajeFluidez: 0.0 (muy entrecortada) a 1.0 (fluida y natural).

    4. Calcula el puntaje total (puntajeTotal) como un promedio ponderado de los demás valores, representando el desempeño general (0.0–1.0).

    5. Genera las listas cualitativas:
      - detallesOmitidos: frases breves con los hechos o detalles importantes no mencionados.
      - palabrasClaveOmitidas: palabras relevantes del GroundTruth ausentes en la descripción.
      - elementosComision: elementos que hayas detectado en el análisis de comisiones.
      - aciertos: hechos, nombres o elementos correctamente recordados.

    6. Redacta una conclusión empática dirigida al paciente:
      - Usa un tono cálido, positivo y motivador.
      - Menciona lo que hizo bien, lo que puede mejorar y algo de ánimo.
      - Evita tecnicismos, juicios clínicos o lenguaje negativo.
      - Tu salida puede ser más descriptiva, aquí tienes un ejemplo simple:
        “Recordaste muy bien a las personas en la foto. Se te escaparon algunos detalles, pero tu historia fue muy bonita y clara. ¡Sigue practicando, lo estás haciendo genial!”

    Usa valores numéricos entre 0.0 y 1.0 con máximo dos decimales de precisión.
    No incluyas explicaciones ni texto adicional fuera del resultado estructurado.
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

    2) ConclusionPaciente (dirigida al paciente):
      - Tono cálido, positivo y motivador.
      - Menciona lo que hizo bien, lo mejorable en palabras simples y ofrece ánimo.
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
}
