import { Test, TestingModule } from '@nestjs/testing';
import { DescripcionesImagenesService } from '../src/descripciones-imagenes/descripciones-imagenes.service';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';

describe('DescripcionesImagenesService', () => {
  let service: DescripcionesImagenesService;

  // Mocks de Prisma
  const mockPrismaClient = {
    $connect: jest.fn(),
    iMAGEN: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    gROUNDTRUTH: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sESION: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    dESCRIPCION: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pUNTAJE: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DescripcionesImagenesService,
      ],
    }).compile();

    service = module.get<DescripcionesImagenesService>(DescripcionesImagenesService);

    // Reemplazar los métodos de Prisma con nuestros mocks
    Object.assign(service, mockPrismaClient);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------IMÁGENES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('buscarImagen', () => {
    it('debe retornar una imagen cuando existe', async () => {
      // Arrange
      const mockImagen = {
        idImagen: 1,
        urlImagen: 'https://test.com/image.jpg',
        idCuidador: 123,
        fechaSubida: new Date(),
        idAsset: 'asset123',
        idPublicImage: 'public123',
        formato: 'jpg',
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);

      // Act
      const resultado = await service.buscarImagen(1);

      // Assert
      expect(resultado).toEqual(mockImagen);
      expect(mockPrismaClient.iMAGEN.findFirst).toHaveBeenCalledWith({
        where: { idImagen: 1 },
      });
      expect(mockPrismaClient.iMAGEN.findFirst).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar RpcException cuando la imagen no existe', async () => {
      // Arrange
      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarImagen(999)).rejects.toThrow(RpcException);
      
      try {
        await service.buscarImagen(999);
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect(error.error.status).toBe(HttpStatus.NOT_FOUND);
        expect(error.error.message).toBe('Imagen no encontrada');
      }
    });
  });

  describe('create', () => {
    it('debe crear una imagen correctamente', async () => {
      // Arrange
      const crearImagenDto = {
        imagenes: [
          {
            urlImagen: 'https://test.com/image.jpg',
            fechaSubida: new Date('2024-01-01'),
            idCuidador: 123,
            idAsset: 'asset123',
            idPublicImage: 'public123',
            formato: 'jpg',
          },
        ],
      };

      const mockImagenCreada = {
        idImagen: 1,
        ...crearImagenDto.imagenes[0],
      };

      mockPrismaClient.iMAGEN.create.mockResolvedValue(mockImagenCreada);

      // Act
      const resultado = await service.create(crearImagenDto);

      // Assert
      expect(resultado).toEqual(mockImagenCreada);
      expect(mockPrismaClient.iMAGEN.create).toHaveBeenCalledWith({
        data: {
          urlImagen: crearImagenDto.imagenes[0].urlImagen,
          idCuidador: crearImagenDto.imagenes[0].idCuidador,
          idAsset: crearImagenDto.imagenes[0].idAsset,
          idPublicImage: crearImagenDto.imagenes[0].idPublicImage,
          formato: crearImagenDto.imagenes[0].formato,
        },
      });
    });

    it('debe lanzar RpcException cuando falla la creación', async () => {
      // Arrange
      const crearImagenDto = {
        imagenes: [
          {
            urlImagen: 'https://test.com/image.jpg',
            fechaSubida: new Date('2024-01-01'),
            idCuidador: 123,
            idAsset: 'asset123',
            idPublicImage: 'public123',
            formato: 'jpg',
          },
        ],
      };

      mockPrismaClient.iMAGEN.create.mockRejectedValue(
        new Error('Error de base de datos')
      );

      // Act & Assert
      await expect(service.create(crearImagenDto)).rejects.toThrow(RpcException);
    });
  });

  describe('listarImagenesCuidador', () => {
    it('debe retornar lista paginada de imágenes', async () => {
      // Arrange
      const imagenPaginationDto = {
        cuidadorId: 123,
        page: 1,
        limit: 10,
      };

      const mockImagenes = [
        {
          idImagen: 1,
          urlImagen: 'https://test.com/image1.jpg',
          idCuidador: 123,
        },
        {
          idImagen: 2,
          urlImagen: 'https://test.com/image2.jpg',
          idCuidador: 123,
        },
      ];

      mockPrismaClient.iMAGEN.count.mockResolvedValue(20);
      mockPrismaClient.iMAGEN.findMany.mockResolvedValue(mockImagenes);

      // Act
      const resultado = await service.listarImagenesCuidador(imagenPaginationDto);

      // Assert
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('meta');
      expect(resultado.data).toEqual(mockImagenes);
      expect(resultado.meta.total).toBe(20);
      expect(resultado.meta.page).toBe(1);
      expect(resultado.meta.lastPage).toBe(2); // 20 total / 10 per page
    });
  });

  /*-------------------------------------------------------------------------*/
  /*------------------------------GROUNDTRUTH--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('crearGroundTruth', () => {
    it('debe crear un ground truth correctamente', async () => {
      // Arrange
      const crearGroundTruthDto = {
        texto: 'Descripción verdadera',
        palabrasClave: ['palabra1', 'palabra2'],
        preguntasGuiaPaciente: ['¿Qué ves?', '¿Dónde está?'],
        idImagen: 1,
      };

      const mockImagen = {
        idImagen: 1,
        urlImagen: 'test.jpg',
      };

      const mockGroundTruth = {
        idGroundtruth: 1,
        ...crearGroundTruthDto,
        fecha: new Date(),
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);
      mockPrismaClient.gROUNDTRUTH.create.mockResolvedValue(mockGroundTruth);

      // Act
      const resultado = await service.crearGroundTruth(crearGroundTruthDto);

      // Assert
      expect(resultado).toEqual(mockGroundTruth);
      expect(mockPrismaClient.iMAGEN.findFirst).toHaveBeenCalled();
      expect(mockPrismaClient.gROUNDTRUTH.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          texto: crearGroundTruthDto.texto,
          idImagen: crearGroundTruthDto.idImagen,
        }),
      });
    });
  });

  describe('buscarGroundTruth', () => {
    it('debe retornar un ground truth cuando existe', async () => {
      // Arrange
      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto verdadero',
        palabrasClave: ['test'],
        idImagen: 1,
        fecha: new Date(),
      };

      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(mockGroundTruth);

      // Act
      const resultado = await service.buscarGroundTruth(1);

      // Assert
      expect(resultado).toEqual(mockGroundTruth);
      expect(mockPrismaClient.gROUNDTRUTH.findFirst).toHaveBeenCalledWith({
        where: { idGroundtruth: 1 },
      });
    });

    it('debe lanzar RpcException cuando no existe', async () => {
      // Arrange
      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarGroundTruth(999)).rejects.toThrow(RpcException);
    });
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------SESIONES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('crearSesion', () => {
    it('debe crear una sesión correctamente', async () => {
      // Arrange
      const crearSesionDto = {
        idPaciente: 1,
        fechaInicio: new Date(),
      };

      const mockSesion = {
        idSesion: 1,
        ...crearSesionDto,
        estado: 'en_progreso',
        sessionRecall: null,
        sessionComision: null,
        sessionOmision: null,
        sessionCoherencia: null,
        sessionFluidez: null,
        sessionTotal: null,
        conclusionTecnica: null,
        conclusionNormal: null,
      };

      mockPrismaClient.sESION.create.mockResolvedValue(mockSesion);

      // Act
      const resultado = await service.crearSesion(crearSesionDto as any);

      // Assert
      expect(resultado).toEqual(mockSesion);
      expect(mockPrismaClient.sESION.create).toHaveBeenCalled();
    });
  });

  describe('buscarSesion', () => {
    it('debe retornar una sesión cuando existe', async () => {
      // Arrange
      const mockSesion = {
        idSesion: 1,
        fechaInicio: new Date(),
        estado: 'en_progreso',
        idPaciente: 1,
        idCuidador: 123,
      };

      mockPrismaClient.sESION.findFirst.mockResolvedValue(mockSesion);

      // Act
      const resultado = await service.buscarSesion(1);

      // Assert
      expect(resultado).toEqual(mockSesion);
    });

    it('debe lanzar RpcException cuando no existe', async () => {
      // Arrange
      mockPrismaClient.sESION.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarSesion(999)).rejects.toThrow(RpcException);
    });
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------DESCRIPCIÓN-----------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('buscarDescripcion', () => {
    it('debe retornar una descripción cuando existe', async () => {
      // Arrange
      const mockDescripcion = {
        idDescripcion: 1,
        texto: 'Descripción de prueba',
        fecha: new Date(),
        idPaciente: 1,
        idImagen: 1,
        idSesion: 1,
      };

      mockPrismaClient.dESCRIPCION.findFirst.mockResolvedValue(mockDescripcion);

      // Act
      const resultado = await service.buscarDescripcion(1);

      // Assert
      expect(resultado).toEqual(mockDescripcion);
      expect(mockPrismaClient.dESCRIPCION.findFirst).toHaveBeenCalledWith({
        where: { idDescripcion: 1 },
      });
    });

    it('debe lanzar RpcException cuando no existe', async () => {
      // Arrange
      mockPrismaClient.dESCRIPCION.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarDescripcion(999)).rejects.toThrow(RpcException);
    });
  });

  describe('listarDescripciones', () => {
    it('debe retornar lista paginada de descripciones de una sesión', async () => {
      // Arrange
      const descripcionPaginationDto = {
        idSesion: 1,
        page: 1,
        limit: 10,
      };

      const mockSesion = {
        idSesion: 1,
        estado: 'en_progreso',
      };

      const mockDescripciones = [
        {
          idDescripcion: 1,
          texto: 'Descripción 1',
          idSesion: 1,
        },
        {
          idDescripcion: 2,
          texto: 'Descripción 2',
          idSesion: 1,
        },
      ];

      mockPrismaClient.sESION.findFirst.mockResolvedValue(mockSesion);
      mockPrismaClient.dESCRIPCION.count.mockResolvedValue(5);
      mockPrismaClient.dESCRIPCION.findMany.mockResolvedValue(mockDescripciones);

      // Act
      const resultado = await service.listarDescripciones(descripcionPaginationDto);

      // Assert
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('meta');
      expect(resultado.data).toEqual(mockDescripciones);
      expect(resultado.meta.total).toBe(5);
      expect(mockPrismaClient.sESION.findFirst).toHaveBeenCalled();
    });
  });
});
