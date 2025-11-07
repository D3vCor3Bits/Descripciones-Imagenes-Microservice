import { Test, TestingModule } from '@nestjs/testing';
import { DescripcionesImagenesController } from '../src/descripciones-imagenes/descripciones-imagenes.controller';
import { DescripcionesImagenesService } from '../src/descripciones-imagenes/descripciones-imagenes.service';

describe('DescripcionesImagenesController', () => {
  let controller: DescripcionesImagenesController;
  let service: DescripcionesImagenesService;

  // Mock del servicio
  const mockService = {
    uploadFile: jest.fn(),
    create: jest.fn(),
    buscarImagen: jest.fn(),
    listarImagenesCuidador: jest.fn(),
    eliminarImagen: jest.fn(),
    crearGroundTruth: jest.fn(),
    buscarGroundTruth: jest.fn(),
    buscarGroundTruthIdImagen: jest.fn(),
    actualizarGroundTruth: jest.fn(),
    eliminarGroundTruth: jest.fn(),
    crearSesion: jest.fn(),
    buscarSesion: jest.fn(),
    listarSesiones: jest.fn(),
    actualizarSesion: jest.fn(),
    crearDescripcion: jest.fn(),
    buscarDescripcion: jest.fn(),
    listarDescripciones: jest.fn(),
    validaUsuarioId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DescripcionesImagenesController],
      providers: [
        {
          provide: DescripcionesImagenesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DescripcionesImagenesController>(
      DescripcionesImagenesController
    );
    service = module.get<DescripcionesImagenesService>(
      DescripcionesImagenesService
    );
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------IMÁGENES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('uploadImage', () => {
    it('debe procesar y subir una imagen correctamente', async () => {
      // Arrange
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('fake-image-data'),
      } as Express.Multer.File;

      const payload = {
        bufferBase64: mockFile.buffer.toString('base64'),
        fieldname: mockFile.fieldname,
        originalname: mockFile.originalname,
        encoding: mockFile.encoding,
        mimetype: mockFile.mimetype,
        idUsuario: 123,
      };

      const mockCloudinaryResponse = {
        secure_url: 'https://cloudinary.com/test.jpg',
        created_at: '2024-01-01',
        asset_id: 'asset123',
        public_id: 'public123',
        format: 'jpg',
      };

      const mockImagenCreada = {
        idImagen: 1,
        urlImagen: mockCloudinaryResponse.secure_url,
        fechaSubida: new Date(),
        idCuidador: 123,
      };

      mockService.uploadFile.mockResolvedValue(mockCloudinaryResponse);
      mockService.create.mockResolvedValue(mockImagenCreada);
      mockService.validaUsuarioId.mockResolvedValue({ rol: 'cuidador' });

      // Act
      const resultado = await controller.uploadImage(payload);

      // Assert
      expect(mockService.uploadFile).toHaveBeenCalled();
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imagenes: expect.arrayContaining([
            expect.objectContaining({
              urlImagen: mockCloudinaryResponse.secure_url,
              idCuidador: 123,
            }),
          ]),
        })
      );
      expect(resultado).toEqual(mockImagenCreada);
    });

    it('debe lanzar error si no hay bufferBase64', async () => {
      // Arrange
      const payload = {
        originalname: 'test.jpg',
        // Sin bufferBase64
      };

      // Act & Assert
      await expect(controller.uploadImage(payload)).rejects.toThrow(
        'No bufferBase64 in payload'
      );
    });
  });

  describe('buscarImagen', () => {
    it('debe llamar al servicio para buscar imagen', async () => {
      // Arrange
      const mockImagen = {
        idImagen: 1,
        urlImagen: 'https://test.com/image.jpg',
        idCuidador: 123,
      };

      mockService.buscarImagen.mockResolvedValue(mockImagen);

      // Act
      const resultado = await controller.buscarImagen(1);

      // Assert
      expect(mockService.buscarImagen).toHaveBeenCalledWith(1);
      expect(resultado).toEqual(mockImagen);
    });
  });

  describe('listarImagenes', () => {
    it('debe llamar al servicio con parámetros de paginación', async () => {
      // Arrange
      const paginationDto = {
        cuidadorId: '123',
        page: 1,
        limit: 10,
      };

      const mockResultado = {
        data: [{ idImagen: 1 }, { idImagen: 2 }],
        meta: {
          total: 20,
          page: 1,
          lastPage: 2,
        },
      };

      mockService.listarImagenesCuidador.mockResolvedValue(mockResultado);

      // Act
      const resultado = await controller.listarImagenes(paginationDto);

      // Assert
      expect(mockService.listarImagenesCuidador).toHaveBeenCalledWith(
        paginationDto
      );
      expect(resultado).toEqual(mockResultado);
    });
  });

  describe('eliminarImagen', () => {
    it('debe llamar al servicio para eliminar imagen', async () => {
      // Arrange
      mockService.eliminarImagen.mockResolvedValue({
        message: 'Imagen eliminada correctamente',
      });

      // Act
      const resultado = await controller.eliminarImagen(1);

      // Assert
      expect(mockService.eliminarImagen).toHaveBeenCalledWith(1);
      expect(resultado).toHaveProperty('message');
    });
  });

  /*-------------------------------------------------------------------------*/
  /*------------------------------GROUNDTRUTH--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('crearGroundTruth', () => {
    it('debe llamar al servicio para crear ground truth', async () => {
      // Arrange
      const crearGroundTruthDto = {
        texto: 'Texto verdadero',
        palabrasClave: ['test'],
        preguntasGuiaPaciente: ['¿Qué ves?'],
        idImagen: 1,
      };

      const mockGroundTruth = {
        idGroundtruth: 1,
        ...crearGroundTruthDto,
        fecha: new Date(),
      };

      mockService.crearGroundTruth.mockResolvedValue(mockGroundTruth);

      // Act
      const resultado = await controller.crearGroundTruth(crearGroundTruthDto);

      // Assert
      expect(mockService.crearGroundTruth).toHaveBeenCalledWith(
        crearGroundTruthDto
      );
      expect(resultado).toEqual(mockGroundTruth);
    });
  });

  describe('buscarGroundTruth', () => {
    it('debe llamar al servicio para buscar ground truth', async () => {
      // Arrange
      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto verdadero',
      };

      mockService.buscarGroundTruth.mockResolvedValue(mockGroundTruth);

      // Act
      const resultado = await controller.buscarGroundTruth(1);

      // Assert
      expect(mockService.buscarGroundTruth).toHaveBeenCalledWith(1);
      expect(resultado).toEqual(mockGroundTruth);
    });
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------SESIONES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('crearSesion', () => {
    it('debe llamar al servicio para crear sesión', async () => {
      // Arrange
      const crearSesionDto = {
        idPaciente: 1,
        fechaInicio: new Date(),
      };

      const mockSesion = {
        idSesion: 1,
        ...crearSesionDto,
        estado: 'en_progreso',
      };

      mockService.crearSesion.mockResolvedValue(mockSesion);

      // Act
      const resultado = await controller.crearSesion(crearSesionDto as any);

      // Assert
      expect(mockService.crearSesion).toHaveBeenCalledWith(crearSesionDto);
      expect(resultado).toEqual(mockSesion);
    });
  });

  describe('buscarSesion', () => {
    it('debe llamar al servicio para buscar sesión', async () => {
      // Arrange
      const mockSesion = {
        idSesion: 1,
        idPaciente: 1,
        estado: 'en_progreso',
      };

      mockService.buscarSesion.mockResolvedValue(mockSesion);

      // Act
      const resultado = await controller.buscarSesion(1);

      // Assert
      expect(mockService.buscarSesion).toHaveBeenCalledWith(1);
      expect(resultado).toEqual(mockSesion);
    });
  });

  describe('listarSesiones', () => {
    it('debe llamar al servicio con parámetros de paginación', async () => {
      // Arrange
      const paginationDto = {
        idPaciente: 'uuid-123',
        page: 1,
        limit: 10,
        estado_sesion: 'en_progreso' as any,
      };

      const mockResultado = {
        data: [{ idSesion: 1 }, { idSesion: 2 }],
        meta: {
          total: 2,
          page: 1,
          lastPage: 1,
        },
      };

      mockService.listarSesiones.mockResolvedValue(mockResultado);

      // Act
      const resultado = await controller.listarSesiones(paginationDto);

      // Assert
      expect(mockService.listarSesiones).toHaveBeenCalledWith(
        paginationDto.idPaciente,
        paginationDto
      );
      expect(resultado).toEqual(mockResultado);
    });
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------DESCRIPCIÓN-----------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('crearDescripcion', () => {
    it('debe llamar al servicio para crear descripción', async () => {
      // Arrange
      const crearDescripcionDto = {
        texto: 'Descripción de prueba',
        fecha: new Date().toISOString(),
        idPaciente: 1,
        idImagen: 1,
        idSesion: 1,
      };

      const mockResultado = {
        descripcion: {
          idDescripcion: 1,
          ...crearDescripcionDto,
        },
        resultados: {
          puntaje: 85,
          mensaje: 'Buen trabajo',
        },
      };

      mockService.crearDescripcion.mockResolvedValue(mockResultado);

      // Act
      const resultado = await controller.crearDescripcion(crearDescripcionDto as any);

      // Assert
      expect(mockService.crearDescripcion).toHaveBeenCalledWith(
        crearDescripcionDto
      );
      expect(resultado).toEqual(mockResultado);
    });
  });

  describe('buscarDescripcion', () => {
    it('debe llamar al servicio para buscar descripción', async () => {
      // Arrange
      const mockDescripcion = {
        idDescripcion: 1,
        texto: 'Descripción de prueba',
        idPaciente: 1,
      };

      mockService.buscarDescripcion.mockResolvedValue(mockDescripcion);

      // Act
      const resultado = await controller.buscarDescripcion(1);

      // Assert
      expect(mockService.buscarDescripcion).toHaveBeenCalledWith(1);
      expect(resultado).toEqual(mockDescripcion);
    });
  });

  describe('listarDescripciones', () => {
    it('debe llamar al servicio con parámetros de paginación', async () => {
      // Arrange
      const paginationDto = {
        idSesion: 1,
        page: 1,
        limit: 10,
      };

      const mockResultado = {
        data: [
          { idDescripcion: 1, texto: 'Desc 1' },
          { idDescripcion: 2, texto: 'Desc 2' },
        ],
        meta: {
          total: 2,
          page: 1,
          lastPage: 1,
        },
      };

      mockService.listarDescripciones.mockResolvedValue(mockResultado);

      // Act
      const resultado = await controller.listarDescripciones(paginationDto);

      // Assert
      expect(mockService.listarDescripciones).toHaveBeenCalledWith(
        paginationDto
      );
      expect(resultado).toEqual(mockResultado);
    });
  });
});
