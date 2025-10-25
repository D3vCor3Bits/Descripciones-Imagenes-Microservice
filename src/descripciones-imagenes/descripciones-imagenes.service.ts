import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './imageProvider/cloudinary-response';
import { CrearDescriptionDto, CrearGroundTruthDto, CrearImagenDto, CrearSesionDto, GetAIresponseDto, SesionPaginationDto } from './dto';
import { RpcException } from '@nestjs/microservices';
import { crearPuntajeDto } from './dto/crear-puntaje.dto';
import { GoogleGenAI, Type} from '@google/genai'
import { envs } from 'src/config';
import { SalidaGeminiInterface } from 'src/interfaces/salida-ai.interface';

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

  findAll() {
    return `This action returns all descripcionesImagenes`;
  }

  async buscarImagen(id: number) {
    try {
      const imagen = await this.iMAGEN.findFirst({
        where: {
          idImagen: id
        }
      })
      return imagen;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: error
      })
    }
  }

  update(id: number, updateDescripcionesImageneDto: any) {
    return `This action updates a #${id} descripcionesImagene`;
  }

  remove(id: number) {
    return `This action removes a #${id} descripcionesImagene`;
  }



  // -------------- GROUNDTRUH -------------------

  async crearGroundTruth(crearGroundTruthDto: CrearGroundTruthDto){
      //Verificar idUsuario

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
          sessionTotal: 0,
          conclusion: "No se ha proporcionado todavía"
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
    const totalPages = await this.sESION.count({
      where: {
        estado: sesionPaginationDto.estado_sesion
      }
    })

    const currentPage = Number(sesionPaginationDto.page);
    const perPage = Number(sesionPaginationDto.limit);

    return {
      data: await this.sESION.findMany({
        skip: (currentPage-1)*perPage,
        take: perPage,
        where: {
          estado: sesionPaginationDto.estado_sesion
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages/perPage)
      }
    }

  }


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
  }

  //--------------- PUNTAJE ------------------
  async crearPuntaje(crearPuntajeDto: crearPuntajeDto){
    const idDescripcion = crearPuntajeDto.idDescripcion;
    await this.buscarDescripcion(idDescripcion);

    try {
      const puntaje = await this.pUNTAJE.create({
      data: {
        idDescripcion: idDescripcion,
        rateOmision: crearPuntajeDto.rateOmision,
        rateComision: crearPuntajeDto.rateComision,
        rateExactitud: crearPuntajeDto.rateExactitud,
        puntajeCoherencia: crearPuntajeDto.puntajeCoherencia,
        puntajeFluidez: crearPuntajeDto.puntajeFluidez,
        puntajeTotal: crearPuntajeDto.puntajeTotal,
        detallesOmitidos: crearPuntajeDto.detallesOmitidos,
        palabrasClaveOmitidas: crearPuntajeDto.palabrasClaveOmitidas,
        aciertos: crearPuntajeDto.aciertos,
        conclusion: crearPuntajeDto.conclusion
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


 // --------------- DESCRIPCION -----------------

  async crearDescripcion(crearDescripcionDto: CrearDescriptionDto){

    //Validar idPaciente
    const idPaciente = crearDescripcionDto.idPaciente;

    //Validación idImagen
    const idImagen = crearDescripcionDto.idImagen;
    await this.buscarImagen(idImagen);

    //Validación idSesion
    const idSesion = crearDescripcionDto.idSesion;
    await this.buscarSesion(idSesion);

    try {
      const descripcion = await this.dESCRIPCION.create({
      data: {
        texto: crearDescripcionDto.texto,
        idPaciente: crearDescripcionDto.idPaciente,
        idImagen: crearDescripcionDto.idImagen,
        idSesion: crearDescripcionDto.idSesion
      }
    })

    //Buscamos groundTruth
    const groundTruthDelaImagen = await this.gROUNDTRUTH.findFirst({
      select:{
        texto: true
      },
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

    const resultadoComparativa = await this.comparacionDescripcionGroundTruth(descripcion.idDescripcion, descripcion.texto, groundTruthDelaImagen.texto)

    return descripcion;
     
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error
      })
    }
  }



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


  // --------- GEMINI AI FUNCTIONS -------

  async comparacionDescripcionGroundTruth(idDescripcion: number, descripcionPaciente: string, groundTruth: string): Promise<SalidaGeminiInterface>{
    const prompt = this.generarPrompt(descripcionPaciente, groundTruth);
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
      await this.pUNTAJE.create({
        data:{
          idDescripcion: idDescripcion,
          rateOmision: result.rateOmision,
          rateComision: result.rateComision,
          rateExactitud: result.rateExactitud,
          puntajeCoherencia: result.puntajeCoherencia,
          puntajeFluidez: result.puntajeFluidez,
          puntajeTotal: result.puntajeTotal,
          detallesOmitidos: result.detallesOmitidos,
          palabrasClaveOmitidas: result.palabrasClaveOmitidas,
          aciertos: result.aciertos,
          conclusion: result.conclusion
        }
      })    

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

  private generarPrompt(descripcionPaciente: string, groundTruth: string){
    return `
      Eres un evaluador experto. Tu tarea es comparar la 'Descripción del Paciente' con el 'Ground Truth' y generar un análisis de similitud en formato JSON.

      Criterios de Evaluación:
      1. Evalúa la presencia de elementos clave de la imagen (personas, objetos, acciones).
      2. Evalúa la precisión y exactitud de los detalles.
      3. Ignora errores menores de ortografía o gramática a menos que cambien el significado.
      4. Asigna una 'matchScore' de 0 (ninguna similitud) a 100 (descripciones idénticas en contenido).

      ---
      Ground Truth (GT):
      "${groundTruth}"

      Descripción del Paciente (DP):
      "${descripcionPaciente}"

      ---
      Genera el JSON estrictamente siguiendo la estructura del esquema provisto, sin texto adicional.
    `;
  }
}
