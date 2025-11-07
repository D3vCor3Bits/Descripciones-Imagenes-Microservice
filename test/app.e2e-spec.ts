import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ClientsModule, Transport, ClientProxy } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { AppModule } from '../src/app.module';

describe('DescripcionesImagenesMS E2E Tests', () => {
  let app: INestApplication;
  let client: ClientProxy;
  let prisma: PrismaClient;
  
  // IDs de datos de prueba
  let testImagenId: number;
  let testSesionId: number;
  let testGroundTruthId: number;
  let testDescripcionId: number;

  beforeAll(async () => {
    // Crear módulo de testing
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ClientsModule.register([
          {
            name: 'NATS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: [process.env.NATS_SERVERS || 'nats://localhost:4222'],
            },
          },
        ]),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Conectar como microservicio NATS
    app.connectMicroservice({
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_SERVERS || 'nats://localhost:4222'],
      },
    });

    await app.startAllMicroservices();
    await app.init();

    // Cliente NATS
    client = app.get('NATS_SERVICE');
    await client.connect();

    // Inicializar Prisma
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    await prisma.$connect();

    // Crear datos de prueba iniciales en la BD
    const imagen = await prisma.iMAGEN.create({
      data: {
        urlImagen: 'https://test.cloudinary.com/test-image.jpg',
        fechaSubida: new Date(),
        idCuidador: '00000000-0000-0000-0000-000000000001', // UUID válido
        idAsset: 'test-asset-e2e',
        idPublicImage: 'test-public-e2e',
        formato: 'jpg',
      },
    });
    testImagenId = imagen.idImagen;

    const sesion = await prisma.sESION.create({
      data: {
        idPaciente: '00000000-0000-0000-0000-000000000002', // UUID válido
        fechaInicioPropuesta: new Date(), // Nombre correcto del campo
        estado: 'en_curso',
        sessionRecall: 7.5,
        sessionComision: 7.0,
        sessionCoherencia: 8.0,
        sessionTotal: 7.5,
        sessionFluidez: 8.5,
      },
    });
    testSesionId = sesion.idSesion;

    const groundTruth = await prisma.gROUNDTRUTH.create({
      data: {
        idImagen: testImagenId,
        texto: 'Un perro corriendo en el parque',
        palabrasClave: ['perro', 'corriendo', 'parque'],
        preguntasGuiaPaciente: ['¿Qué animal ves?', '¿Qué está haciendo?'],
      },
    });
    testGroundTruthId = groundTruth.idGroundtruth;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    try {
      if (testDescripcionId) {
        await prisma.pUNTAJE.deleteMany({
          where: { idDescripcion: testDescripcionId },
        });
        await prisma.dESCRIPCION.delete({
          where: { idDescripcion: testDescripcionId },
        }).catch(() => {});
      }
      if (testGroundTruthId) {
        await prisma.gROUNDTRUTH.delete({
          where: { idGroundtruth: testGroundTruthId },
        }).catch(() => {});
      }
      if (testImagenId) {
        await prisma.iMAGEN.delete({
          where: { idImagen: testImagenId },
        }).catch(() => {});
      }
      if (testSesionId) {
        await prisma.sESION.delete({
          where: { idSesion: testSesionId },
        }).catch(() => {});
      }
    } catch (error) {
      console.log('Error limpiando datos:', error);
    }

    await prisma.$disconnect();
    await client.close();
    await app.close();
  });

  /*-------------------------------------------------------------------------*/
  /*----------------------------PRUEBAS IMÁGENES-----------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('Imágenes', () => {
    it('debe buscar una imagen por ID', async () => {
      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'buscarImagen' }, { id: testImagenId }),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.idImagen).toBe(testImagenId);
      expect(response.urlImagen).toBeDefined();
      expect(response.idCuidador).toBe('00000000-0000-0000-0000-000000000001');
    }, 30000);

    it('debe listar imágenes de un cuidador con paginación', async () => {
      // Arrange
      const paginationDto = {
        page: 1,
        limit: 10,
        cuidadorId: '00000000-0000-0000-0000-000000000001', // UUID válido
      };

      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'listarImagenes' }, paginationDto),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    }, 30000);
  });

  /*-------------------------------------------------------------------------*/
  /*--------------------------PRUEBAS GROUND TRUTH---------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('Ground Truth', () => {
    it('debe buscar ground truth por ID', async () => {
      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'buscarGroundTruth' }, { id: testGroundTruthId }),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.idGroundtruth).toBe(testGroundTruthId);
      expect(response.texto).toBe('Un perro corriendo en el parque');
    }, 30000);

    it('debe buscar ground truth por ID de imagen', async () => {
      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'buscarGroundTruthIdImagen' }, { id: testImagenId }),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.idImagen).toBe(testImagenId);
      expect(response.texto).toBeDefined();
    }, 30000);
  });

  /*-------------------------------------------------------------------------*/
  /*----------------------------PRUEBAS SESIONES-----------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('Sesiones', () => {
    it('debe buscar una sesión por ID', async () => {
      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'buscarSesion' }, { id: testSesionId }),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.idSesion).toBe(testSesionId);
      expect(response.idPaciente).toBe('00000000-0000-0000-0000-000000000002');
      expect(response.estado).toBe('en_curso');
    }, 30000);

    it('debe listar sesiones de un paciente', async () => {
      // Arrange
      const paginationDto = {
        page: 1,
        limit: 10,
        idPaciente: '00000000-0000-0000-0000-000000000002', // UUID válido
      };

      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'listarSesiones' }, paginationDto),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(Array.isArray(response.data)).toBe(true);
    }, 30000);

    it('debe actualizar una sesión', async () => {
      // Arrange
      const actualizarDto = {
        id: testSesionId,
        sessionRecall: 8.0,
        sessionTotal: 8.0,
      };

      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'actualizarSesion' }, actualizarDto),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.sessionRecall).toBe(8.0);
      
      // Verificar en BD
      const sesionActualizada = await prisma.sESION.findUnique({
        where: { idSesion: testSesionId },
      });
      expect(sesionActualizada?.sessionRecall).toBe(8.0);
    }, 30000);
  });

  /*-------------------------------------------------------------------------*/
  /*--------------------------PRUEBAS DESCRIPCIONES--------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('Descripciones', () => {
    let nuevaImagenId: number;

    beforeAll(async () => {
      // Crear una segunda imagen SOLO para el test de crear descripción
      // (porque idImagen es UNIQUE en DESCRIPCION)
      const nuevaImagen = await prisma.iMAGEN.create({
        data: {
          urlImagen: 'https://test.com/imagen-descripcion.jpg',
          fechaSubida: new Date(),
          idCuidador: '00000000-0000-0000-0000-000000000001', // UUID válido
          idAsset: 'asset-desc-123',
          idPublicImage: 'public-desc-123',
          formato: 'jpg',
        },
      });
      nuevaImagenId = nuevaImagen.idImagen;

      // Crear ground truth para esta imagen
      await prisma.gROUNDTRUTH.create({
        data: {
          texto: 'Un perro jugando en el parque con una pelota',
          idImagen: nuevaImagenId,
          palabrasClave: ['perro', 'parque', 'pelota'],
          preguntasGuiaPaciente: ['¿Qué animal ves?', '¿Qué está haciendo?'],
        },
      });
    });

    afterAll(async () => {
      // Limpiar imagen adicional
      if (nuevaImagenId) {
        await prisma.gROUNDTRUTH.deleteMany({ where: { idImagen: nuevaImagenId } });
        await prisma.iMAGEN.delete({ where: { idImagen: nuevaImagenId } }).catch(() => {});
      }
    });

    it('debe crear una descripción y calcular puntaje automáticamente', async () => {
      // Arrange
      const crearDescripcionDto = {
        idPaciente: '00000000-0000-0000-0000-000000000002', // UUID válido
        idImagen: nuevaImagenId, // Usar la nueva imagen (idImagen es UNIQUE)
        idSesion: testSesionId,
        texto: 'Un perro jugando en el parque con una pelota',
      };

      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'crearDescripcion' }, crearDescripcionDto),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.descripcion).toBeDefined();
      expect(response.descripcion.idDescripcion).toBeDefined();
      expect(response.resultados).toBeDefined(); // ⚠️ Campo correcto es "resultados"
      expect(response.resultados.puntajeTotal).toBeDefined();

      // Guardar ID para siguiente test
      testDescripcionId = response.descripcion.idDescripcion;

      // Verificar en BD
      const descripcionEnBD = await prisma.dESCRIPCION.findUnique({
        where: { idDescripcion: testDescripcionId },
      });
      expect(descripcionEnBD).toBeDefined();
      expect(descripcionEnBD?.idImagen).toBe(nuevaImagenId);
    }, 30000);

    it('debe buscar una descripción por ID', async () => {
      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'buscarDescripcion' }, { id: testDescripcionId }),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.idDescripcion).toBe(testDescripcionId);
      expect(response.texto).toBeDefined();
    }, 30000);

    it('debe listar descripciones de una sesión', async () => {
      // Arrange
      const paginationDto = {
        page: 1,
        limit: 10,
        idSesion: testSesionId,
      };

      // Act
      const response = await firstValueFrom(
        client.send({ cmd: 'listarDescripciones' }, paginationDto),
      );

      // Assert
      expect(response).toBeDefined();
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    }, 30000);
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------FLUJO COMPLETO E2E----------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('Flujo Completo', () => {
    it('debe realizar flujo completo: Sesión → Descripción → Puntaje', async () => {
      // 0. Crear imagen única para este flujo (idImagen es UNIQUE en DESCRIPCION)
      const imagenFlujo = await prisma.iMAGEN.create({
        data: {
          urlImagen: 'https://test.com/imagen-flujo.jpg',
          fechaSubida: new Date(),
          idCuidador: '00000000-0000-0000-0000-000000000001', // UUID válido
          idAsset: 'asset-flujo-456',
          idPublicImage: 'public-flujo-456',
          formato: 'jpg',
        },
      });

      // Crear GT para la imagen
      await prisma.gROUNDTRUTH.create({
        data: {
          texto: 'Un canino corriendo alegremente',
          idImagen: imagenFlujo.idImagen,
          palabrasClave: ['canino', 'corriendo', 'alegre'],
          preguntasGuiaPaciente: ['¿Qué ves?'],
        },
      });

      // 1. Verificar que la sesión existe
      const sesion = await firstValueFrom(
        client.send({ cmd: 'buscarSesion' }, { id: testSesionId }),
      );
      expect(sesion).toBeDefined();

      // 2. Verificar que la imagen y GT existen
      const imagen = await firstValueFrom(
        client.send({ cmd: 'buscarImagen' }, { id: imagenFlujo.idImagen }),
      );
      expect(imagen).toBeDefined();

      const gt = await firstValueFrom(
        client.send({ cmd: 'buscarGroundTruthIdImagen' }, { id: imagenFlujo.idImagen }),
      );
      expect(gt).toBeDefined();

      // 3. Crear una nueva descripción
      const crearDescripcionDto = {
        idPaciente: '00000000-0000-0000-0000-000000000002', // UUID válido
        idImagen: imagenFlujo.idImagen,
        idSesion: testSesionId,
        texto: 'Un canino corriendo alegremente',
      };

      const descripcionResponse = await firstValueFrom(
        client.send({ cmd: 'crearDescripcion' }, crearDescripcionDto),
      );
      expect(descripcionResponse.descripcion).toBeDefined();
      expect(descripcionResponse.resultados).toBeDefined();
      expect(descripcionResponse.resultados.puntajeTotal).toBeDefined();

      // 4. Verificar que se creó el puntaje en BD
      const puntajeEnBD = await prisma.pUNTAJE.findFirst({
        where: { idDescripcion: descripcionResponse.descripcion.idDescripcion },
      });
      expect(puntajeEnBD).toBeDefined();
      expect(puntajeEnBD?.puntajeTotal).toBeDefined();

      // Limpiar datos de prueba del flujo
      await prisma.pUNTAJE.deleteMany({
        where: { idDescripcion: descripcionResponse.descripcion.idDescripcion },
      });
      await prisma.dESCRIPCION.delete({
        where: { idDescripcion: descripcionResponse.descripcion.idDescripcion },
      });
      await prisma.gROUNDTRUTH.deleteMany({ where: { idImagen: imagenFlujo.idImagen } });
      await prisma.iMAGEN.delete({ where: { idImagen: imagenFlujo.idImagen } });
    }, 60000);
  });
});
