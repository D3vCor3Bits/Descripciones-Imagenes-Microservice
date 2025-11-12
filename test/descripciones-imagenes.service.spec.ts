import { Test, TestingModule } from '@nestjs/testing';
import { DescripcionesImagenesService } from '../src/descripciones-imagenes/descripciones-imagenes.service';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';

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
      update: jest.fn(),
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
      groupBy: jest.fn(),
    },
    dESCRIPCION: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pUNTAJE: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    vW_PromediosPorSesion: {
      findFirst: jest.fn(),
    },
  };

  const mockNatsClient = {
    send: jest.fn().mockReturnValue(of({ usuarios: [{ rol: 'cuidador' }] })),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DescripcionesImagenesService,
        {
          provide: 'NATS_SERVICE',
          useValue: mockNatsClient,
        },
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
        include: { GROUNDTRUTH: true },
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
            idCuidador: '123',
            idAsset: 'asset123',
            idPublicImage: 'public123',
            formato: 'jpg',
            idSesion: null,
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
          fechaSubida: crearImagenDto.imagenes[0].fechaSubida,
          idSesion: crearImagenDto.imagenes[0].idSesion,
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
            idCuidador: '123',
            idAsset: 'asset123',
            idPublicImage: 'public123',
            formato: 'jpg',
            idSesion: null,
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
        cuidadorId: '123',
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

  describe('eliminarImagen', () => {
    it('debe eliminar una imagen correctamente dentro de las 24 horas', async () => {
      // Arrange
      const mockImagen = {
        idImagen: 1,
        urlImagen: 'https://test.com/image.jpg',
        fechaSubida: new Date(), // Fecha actual (< 24 horas)
        idCuidador: '123',
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);
      mockPrismaClient.iMAGEN.delete.mockResolvedValue(mockImagen);

      // Act
      const resultado = await service.eliminarImagen(1);

      // Assert
      expect(resultado).toHaveProperty('message');
      expect(resultado.message).toBe('Imagen eliminada correctamente');
      expect(mockPrismaClient.iMAGEN.delete).toHaveBeenCalledWith({
        where: { idImagen: 1 },
      });
    });

    it('debe lanzar RpcException si han pasado más de 24 horas', async () => {
      // Arrange
      const fechaAntigua = new Date();
      fechaAntigua.setDate(fechaAntigua.getDate() - 2); // 2 días atrás

      const mockImagen = {
        idImagen: 1,
        urlImagen: 'https://test.com/image.jpg',
        fechaSubida: fechaAntigua,
        idCuidador: '123',
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);

      // Act & Assert
      await expect(service.eliminarImagen(1)).rejects.toThrow(RpcException);
      
      try {
        await service.eliminarImagen(1);
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect(error.error.status).toBe(HttpStatus.FORBIDDEN);
        expect(error.error.message).toContain('han pasado más de 24 horas');
      }
    });

    it('debe lanzar RpcException si la imagen no existe', async () => {
      // Arrange
      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.eliminarImagen(999)).rejects.toThrow(RpcException);
    });
  });

  describe('actualizarImagen', () => {
    it('debe actualizar una imagen correctamente', async () => {
      // Arrange
      const idImagen = 1;
      const actualizarImagenDto = {
        idImagen: 1,
        idSesion: 5,
      };

      const mockImagen = {
        idImagen: 1,
        urlImagen: 'https://test.com/image.jpg',
        idCuidador: '123',
        GROUNDTRUTH: null,
      };

      const mockSesion = {
        idSesion: 5,
        estado: 'pendiente',
        IMAGEN: [],
      };

      const mockImagenActualizada = {
        ...mockImagen,
        idSesion: 5,
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);
      mockPrismaClient.sESION.findFirst.mockResolvedValue(mockSesion); // Mock para buscarSesion
      mockPrismaClient.iMAGEN.count.mockResolvedValue(0); // Mock para validar que no haya ya 3 imágenes
      mockPrismaClient.iMAGEN.update.mockResolvedValue(mockImagenActualizada);

      // Act
      const resultado = await service.actualizarImagen(idImagen, actualizarImagenDto);

      // Assert
      expect(resultado).toEqual(mockImagenActualizada);
      expect(mockPrismaClient.iMAGEN.update).toHaveBeenCalledWith({
        where: { idImagen: 1 },
        data: { idSesion: 5 },
      });
    });

    it('debe lanzar RpcException si la imagen no existe', async () => {
      // Arrange
      const actualizarImagenDto = {
        idImagen: 999,
        idSesion: 5,
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.actualizarImagen(999, actualizarImagenDto)
      ).rejects.toThrow(RpcException);
    });

    it('debe lanzar RpcException si falla la actualización', async () => {
      // Arrange
      const actualizarImagenDto = {
        idImagen: 1,
        idSesion: 5,
      };

      const mockImagen = {
        idImagen: 1,
        urlImagen: 'https://test.com/image.jpg',
        idCuidador: '123',
        GROUNDTRUTH: null,
      };

      const mockSesion = {
        idSesion: 5,
        estado: 'pendiente',
        IMAGEN: [],
      };

      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);
      mockPrismaClient.sESION.findFirst.mockResolvedValue(mockSesion);
      mockPrismaClient.iMAGEN.count.mockResolvedValue(0);
      mockPrismaClient.iMAGEN.update.mockRejectedValue(
        new Error('Error de base de datos')
      );

      // Act & Assert
      await expect(
        service.actualizarImagen(1, actualizarImagenDto)
      ).rejects.toThrow(Error);
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

  describe('buscarGroundTruthIdImagen', () => {
    it('debe retornar un ground truth cuando existe para una imagen', async () => {
      // Arrange
      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto verdadero',
        palabrasClave: ['test'],
        idImagen: 10,
        fecha: new Date(),
      };

      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(mockGroundTruth);

      // Act
      const resultado = await service.buscarGroundTruthIdImagen(10);

      // Assert
      expect(resultado).toEqual(mockGroundTruth);
      expect(mockPrismaClient.gROUNDTRUTH.findFirst).toHaveBeenCalledWith({
        where: { idImagen: 10 },
      });
    });

    it('debe lanzar RpcException cuando no existe GT para la imagen', async () => {
      // Arrange
      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarGroundTruthIdImagen(999)).rejects.toThrow(RpcException);
    });
  });

  describe('actualizarGroundTruth', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('debe actualizar un ground truth correctamente dentro de las 24 horas', async () => {
      // Arrange
      const idGt = 1;
      const actualizarGtDto = {
        id: 1,
        texto: 'Texto actualizado',
        palabrasClave: ['nueva', 'palabra'],
      };

      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto original',
        idImagen: 5,
        fecha: new Date(), // Menos de 24 horas
      };

      const mockGroundTruthActualizado = {
        ...mockGroundTruth,
        texto: 'Texto actualizado',
        palabrasClave: ['nueva', 'palabra'],
      };

      mockPrismaClient.gROUNDTRUTH.findFirst
        .mockResolvedValueOnce(mockGroundTruth) // buscarGroundTruth
        .mockResolvedValueOnce(mockGroundTruth); // segunda llamada interna
      mockPrismaClient.dESCRIPCION.findFirst.mockResolvedValue(null); // No hay descripción
      mockPrismaClient.gROUNDTRUTH.update.mockResolvedValue(mockGroundTruthActualizado);

      // Act
      const resultado = await service.actualizarGroundTruth(idGt, actualizarGtDto);

      // Assert
      expect(resultado).toEqual(mockGroundTruthActualizado);
      expect(mockPrismaClient.gROUNDTRUTH.update).toHaveBeenCalledWith({
        where: { idGroundtruth: 1 },
        data: { texto: 'Texto actualizado', palabrasClave: ['nueva', 'palabra'] },
      });
    });

    it('debe lanzar RpcException si ya existe una descripción de la imagen', async () => {
      // Arrange
      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto original',
        idImagen: 5,
        fecha: new Date(),
      };

      const mockDescripcion = {
        idDescripcion: 1,
        idImagen: 5,
        texto: 'Descripción del paciente',
      };

      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(mockGroundTruth);
      mockPrismaClient.dESCRIPCION.findFirst.mockResolvedValue(mockDescripcion);

      // Act & Assert
      await expect(
        service.actualizarGroundTruth(1, { id: 1, texto: 'Nuevo' })
      ).rejects.toThrow(RpcException);
    });
  });

  describe('eliminarGroundTruth', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('debe lanzar RpcException si han pasado más de 24 horas', async () => {
      // Arrange
      const fechaAntigua = new Date();
      fechaAntigua.setDate(fechaAntigua.getDate() - 3);

      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto',
        idImagen: 5,
        fecha: fechaAntigua,
      };

      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(mockGroundTruth);

      // Act & Assert
      await expect(service.eliminarGroundTruth(1)).rejects.toThrow(RpcException);
    });

    it('debe lanzar RpcException si ya existe una descripción', async () => {
      // Arrange
      const mockGroundTruth = {
        idGroundtruth: 1,
        texto: 'Texto',
        idImagen: 5,
        fecha: new Date(),
      };

      const mockDescripcion = {
        idDescripcion: 1,
        idImagen: 5,
      };

      mockPrismaClient.gROUNDTRUTH.findFirst.mockResolvedValue(mockGroundTruth);
      mockPrismaClient.dESCRIPCION.findFirst.mockResolvedValue(mockDescripcion);

      // Act & Assert
      await expect(service.eliminarGroundTruth(1)).rejects.toThrow(RpcException);
    });
  });

  /*-------------------------------------------------------------------------*/
  /*---------------------------------SESIONES--------------------------------*/
  /*-------------------------------------------------------------------------*/

  describe('crearSesion', () => {
    it('debe crear una sesión correctamente', async () => {
      // Arrange
      const crearSesionDto = {
        idCuidador: 'uuid-cuidador',
        fechaInicioPropuesta: new Date(),
        imagenesIds: [1, 2, 3],
      };

      const mockSesion = {
        idSesion: 1,
        idPaciente: 'uuid-paciente',
        idCuidador: 'uuid-cuidador',
        fechaCreacion: expect.any(Date),
        fechaInicioPropuesta: expect.any(Date),
        estado: 'pendiente',
        sessionRecall: 0,
        sessionComision: 0,
        sessionOmision: 0,
        sessionCoherencia: 0,
        sessionFluidez: 0,
        sessionTotal: 0,
        conclusionTecnica: "No se ha proporcionado todavía",
        conclusionNormal: "No se ha proporcionado todavía",
        activacion: false,
        notasMedico: "No hay notas aún",
        fechaRevisionMedico: null,
      };

      const mockImagen = {
        idImagen: 1,
        idCuidador: 'uuid-cuidador',
        idSesion: null,
        urlImagen: 'https://example.com/image.jpg',
        GROUNDTRUTH: null,
      };

      // Mock para validaUsuarioId
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: 'uuid-cuidador' }] 
      }));
      
      // Mock para pacienteCuidador
      mockNatsClient.send.mockReturnValueOnce(of([{ idPaciente: 'uuid-paciente' }]));

      // Mock para buscarImagen (validación de imágenes) - se llama para cada imagen
      mockPrismaClient.iMAGEN.findFirst.mockResolvedValue(mockImagen);

      // Mock para crear sesión
      mockPrismaClient.sESION.create.mockResolvedValue(mockSesion);

      // Mock para actualizar imágenes (se llama internamente en actualizarImagen)
      mockPrismaClient.iMAGEN.update.mockResolvedValue({ ...mockImagen, idSesion: 1 });

      // Mock de buscarSesion (llamado dentro de actualizarImagen)
      mockPrismaClient.sESION.findFirst.mockResolvedValue({
        idSesion: 1,
        estado: 'pendiente',
        IMAGEN: [],
      });

      // Mock de count para actualizarImagen
      mockPrismaClient.iMAGEN.count.mockResolvedValue(0);

      // Act
      const resultado = await service.crearSesion(crearSesionDto as any);

      // Assert
      expect(resultado).toEqual(mockSesion);
      expect(mockPrismaClient.sESION.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idCuidador: 'uuid-cuidador',
          idPaciente: 'uuid-paciente',
          sessionRecall: 0,
          sessionComision: 0,
          activacion: false,
          notasMedico: "No hay notas aún",
        })
      });
    });

    it('debe lanzar excepción si el usuario no es cuidador o administrador', async () => {
      // Arrange
      const crearSesionDto = {
        idCuidador: 'uuid-paciente',
        imagenesIds: [],
      };

      // Mock para validaUsuarioId - retorna un paciente
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: 'uuid-paciente' }] 
      }));

      // Act & Assert
      await expect(service.crearSesion(crearSesionDto as any))
        .rejects
        .toThrow(RpcException);
    });

    it('debe lanzar excepción si no hay paciente asociado al cuidador', async () => {
      // Arrange
      const crearSesionDto = {
        idCuidador: 'uuid-cuidador',
        imagenesIds: [],
      };

      // Mock para validaUsuarioId
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: 'uuid-cuidador' }] 
      }));
      
      // Mock para pacienteCuidador - array vacío
      mockNatsClient.send.mockReturnValueOnce(of([]));

      // Act & Assert
      await expect(service.crearSesion(crearSesionDto as any))
        .rejects
        .toThrow(RpcException);
    });

    it('debe lanzar excepción si se intentan asociar más de 3 imágenes', async () => {
      // Arrange
      const crearSesionDto = {
        idCuidador: 'uuid-cuidador',
        imagenesIds: [1, 2, 3, 4],
      };

      // Mock para validaUsuarioId
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: 'uuid-cuidador' }] 
      }));
      
      // Mock para pacienteCuidador
      mockNatsClient.send.mockReturnValueOnce(of([{ idPaciente: 'uuid-paciente' }]));

      // Act & Assert
      await expect(service.crearSesion(crearSesionDto as any))
        .rejects
        .toThrow(RpcException);
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

  describe('actualizarSesion', () => {
    it('debe actualizar una sesión correctamente', async () => {
      // Arrange
      const idSesion = 1;
      const actualizarSesionDto = {
        id: 1,
        estado: 'completado' as any,
        sessionTotal: 0.85,
        conclusionTecnica: 'Conclusión técnica actualizada',
      };

      const mockSesion = {
        idSesion: 1,
        estado: 'en_curso',
        IMAGEN: [],
      };

      const mockSesionActualizada = {
        ...mockSesion,
        estado: 'completado',
        sessionTotal: 0.85,
        conclusionTecnica: 'Conclusión técnica actualizada',
      };

      mockPrismaClient.sESION.findFirst.mockResolvedValue(mockSesion);
      mockPrismaClient.sESION.update.mockResolvedValue(mockSesionActualizada);

      // Act
      const resultado = await service.actualizarSesion(idSesion, actualizarSesionDto);

      // Assert
      expect(resultado).toEqual(mockSesionActualizada);
      expect(mockPrismaClient.sESION.update).toHaveBeenCalledWith({
        where: { idSesion: 1 },
        data: {
          estado: 'completado',
          sessionTotal: 0.85,
          conclusionTecnica: 'Conclusión técnica actualizada',
        },
      });
    });

    it('debe lanzar RpcException si la sesión no existe', async () => {
      // Arrange
      mockPrismaClient.sESION.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.actualizarSesion(999, { id: 999, estado: 'completado' as any })
      ).rejects.toThrow(RpcException);
    });
  });

  describe('cantidadSesionesPaciente', () => {
    it('debe retornar la cantidad de sesiones de un paciente', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: idPaciente }] 
      }));

      mockPrismaClient.sESION.count.mockResolvedValue(5);

      // Act
      const resultado = await service.cantidadSesionesPaciente(idPaciente);

      // Assert
      expect(resultado).toHaveProperty('cantidad');
      expect(resultado.cantidad).toBe(5);
      expect(mockPrismaClient.sESION.count).toHaveBeenCalledWith({
        where: { idPaciente },
      });
    });

    it('debe lanzar RpcException si el usuario no es un paciente', async () => {
      // Arrange
      const idCuidador = 'uuid-cuidador';
      
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: idCuidador }] 
      }));

      // Act & Assert
      await expect(service.cantidadSesionesPaciente(idCuidador)).rejects.toThrow(RpcException);
    });
  });

  describe('baseline', () => {
    it('debe retornar el baseline (primera sesión) de un paciente', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      
      const mockBaseline = {
        idSesion: 1,
        idPaciente,
        estado: 'completado',
        IMAGEN: [
          {
            urlImagen: 'https://test.com/image1.jpg',
            fechaSubida: new Date(),
            DESCRIPCION: {
              texto: 'Primera descripción',
              fecha: new Date(),
            },
            GROUNDTRUTH: {
              texto: 'Ground truth 1',
              fecha: new Date(),
              palabrasClave: ['palabra1'],
              preguntasGuiaPaciente: ['¿Qué ves?'],
            },
          },
        ],
      };

      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: idPaciente }] 
      }));

      mockPrismaClient.sESION.findFirst.mockResolvedValue(mockBaseline);

      // Act
      const resultado = await service.baseline(idPaciente);

      // Assert
      expect(resultado).toEqual(mockBaseline);
      expect(mockPrismaClient.sESION.findFirst).toHaveBeenCalledWith({
        where: { idPaciente },
        orderBy: { fechaCreacion: 'asc' },
        include: {
          IMAGEN: {
            select: {
              idImagen: true,
              idCuidador: true,
              urlImagen: true,
              fechaSubida: true,
              DESCRIPCION: {
                select: {
                  texto: true,
                  fecha: true,
                },
              },
              GROUNDTRUTH: {
                select: {
                  idGroundtruth: true,
                  texto: true,
                  fecha: true,
                  palabrasClave: true,
                  preguntasGuiaPaciente: true,
                },
              },
            },
          },
        },
      });
    });

    it('debe lanzar RpcException si el usuario no es un paciente', async () => {
      // Arrange
      const idMedico = 'uuid-medico';
      
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'medico', idUsuario: idMedico }] 
      }));

      // Act & Assert
      await expect(service.baseline(idMedico)).rejects.toThrow(RpcException);
    });
  });

  describe('listarSesiones', () => {
    it('debe retornar lista paginada de sesiones de un paciente', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      const sesionPaginationDto = {
        idPaciente,
        page: 1,
        limit: 10,
        estado_sesion: 'pendiente' as any,
      };

      const mockSesiones = [
        {
          idSesion: 1,
          idPaciente,
          estado: 'pendiente',
          IMAGEN: [],
        },
      ];

      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: idPaciente }] 
      }));

      mockPrismaClient.sESION.count.mockResolvedValue(3);
      mockPrismaClient.sESION.findMany.mockResolvedValue(mockSesiones);

      // Act
      const resultado = await service.listarSesiones(idPaciente, sesionPaginationDto);

      // Assert
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('meta');
      expect(resultado.data).toEqual(mockSesiones);
      expect(resultado.meta.total).toBe(3);
      expect(mockPrismaClient.sESION.count).toHaveBeenCalledWith({
        where: {
          estado: 'pendiente',
          idPaciente,
        },
      });
    });

    it('debe lanzar RpcException si el usuario no es paciente', async () => {
      // Arrange
      const idCuidador = 'uuid-cuidador';
      const sesionPaginationDto = {
        idPaciente: idCuidador,
        page: 1,
        limit: 10,
      };

      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: idCuidador }] 
      }));

      // Act & Assert
      await expect(
        service.listarSesiones(idCuidador, sesionPaginationDto as any)
      ).rejects.toThrow(RpcException);
    });
  });

  describe('listarSesionesConGt', () => {
    it('debe retornar lista paginada de sesiones con ground truth', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      const sesionPaginationDto = {
        idPaciente,
        page: 1,
        limit: 10,
        estado_sesion: 'completado' as any,
      };

      const mockSesiones = [
        {
          idSesion: 1,
          idPaciente,
          estado: 'completado',
          IMAGEN: [
            {
              urlImagen: 'https://test.com/img1.jpg',
              DESCRIPCION: { texto: 'Desc 1' },
              GROUNDTRUTH: { texto: 'GT 1', palabrasClave: ['test'] },
            },
          ],
        },
      ];

      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: idPaciente }] 
      }));

      mockPrismaClient.sESION.count.mockResolvedValue(1);
      mockPrismaClient.sESION.findMany.mockResolvedValue(mockSesiones);

      // Act
      const resultado = await service.listarSesionesConGt(idPaciente, sesionPaginationDto);

      // Assert
      expect(resultado).toHaveProperty('data');
      expect(resultado.data).toEqual(mockSesiones);
      expect(resultado.data[0].IMAGEN[0]).toHaveProperty('GROUNDTRUTH');
    });
  });

  describe('listarSesionesPacienteCompletadas', () => {
    it('debe retornar todas las sesiones completadas de un paciente sin paginación', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';

      const mockSesiones = [
        { idSesion: 1, estado: 'completado', idPaciente },
        { idSesion: 2, estado: 'completado', idPaciente },
      ];

      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: idPaciente }] 
      }));

      mockPrismaClient.sESION.findMany.mockResolvedValue(mockSesiones);

      // Act
      const resultado = await service.listarSesionesPacienteCompletadas(idPaciente);

      // Assert
      expect(resultado).toEqual(mockSesiones);
      expect(mockPrismaClient.sESION.findMany).toHaveBeenCalledWith({
        where: {
          idPaciente,
          estado: 'completado',
        },
      });
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
        include: { PUNTAJE: true },
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

  /*-------------------------------------------------------------------------*/
  /*-------------------------NUEVAS FUNCIONES DE SESIONES--------------------*/
  /*-------------------------------------------------------------------------*/

  describe('listarSesionesCuidador', () => {
    it('debe listar todas las sesiones creadas por un cuidador', async () => {
      // Arrange
      const idCuidador = 'uuid-cuidador';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
        estado_sesion: undefined,
      };

      const mockUsuario = {
        rol: 'cuidador',
        idUsuario: 'uuid-cuidador',
      };

      const mockSesiones = [
        {
          idSesion: 1,
          idCuidador: 'uuid-cuidador',
          idPaciente: 'uuid-paciente-1',
          estado: 'pendiente',
          fechaCreacion: new Date(),
        },
        {
          idSesion: 2,
          idCuidador: 'uuid-cuidador',
          idPaciente: 'uuid-paciente-2',
          estado: 'en_curso',
          fechaCreacion: new Date(),
        },
      ];

      // Mock validación de usuario
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [mockUsuario] 
      }));

      // Mock count y findMany
      mockPrismaClient.sESION.count.mockResolvedValue(2);
      mockPrismaClient.sESION.findMany.mockResolvedValue(mockSesiones);

      // Act
      const resultado = await service.listarSesionesCuidador(idCuidador, sesionPaginationDto as any);

      // Assert
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('meta');
      expect(resultado.data).toEqual(mockSesiones);
      expect(resultado.meta.total).toBe(2);
      expect(mockPrismaClient.sESION.count).toHaveBeenCalledWith({
        where: {
          idCuidador: 'uuid-cuidador',
        }
      });
    });

    it('debe filtrar por estado_sesion cuando se proporciona', async () => {
      // Arrange
      const idCuidador = 'uuid-cuidador';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
        estado_sesion: 'completado',
      };

      const mockUsuario = {
        rol: 'cuidador',
        idUsuario: 'uuid-cuidador',
      };

      // Mock validación de usuario
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [mockUsuario] 
      }));

      mockPrismaClient.sESION.count.mockResolvedValue(1);
      mockPrismaClient.sESION.findMany.mockResolvedValue([]);

      // Act
      await service.listarSesionesCuidador(idCuidador, sesionPaginationDto as any);

      // Assert
      expect(mockPrismaClient.sESION.count).toHaveBeenCalledWith({
        where: {
          idCuidador: 'uuid-cuidador',
          estado: 'completado',
        }
      });
    });

    it('debe lanzar excepción si el usuario no es cuidador o administrador', async () => {
      // Arrange
      const idCuidador = 'uuid-paciente';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
      };

      // Mock validación de usuario - retorna paciente
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: 'uuid-paciente' }] 
      }));

      // Act & Assert
      await expect(service.listarSesionesCuidador(idCuidador, sesionPaginationDto as any))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('listarSesionesPacientePorCuidador', () => {
    it('debe listar sesiones de un paciente creadas por un cuidador específico', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      const idCuidador = 'uuid-cuidador';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
        estado_sesion: undefined,
      };

      const mockPaciente = {
        rol: 'paciente',
        idUsuario: 'uuid-paciente',
      };

      const mockCuidador = {
        rol: 'cuidador',
        idUsuario: 'uuid-cuidador',
      };

      const mockSesiones = [
        {
          idSesion: 1,
          idCuidador: 'uuid-cuidador',
          idPaciente: 'uuid-paciente',
          estado: 'pendiente',
          fechaCreacion: new Date(),
        },
      ];

      // Mock validación de paciente
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [mockPaciente] 
      }));

      // Mock validación de cuidador
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [mockCuidador] 
      }));

      // Mock count y findMany
      mockPrismaClient.sESION.count.mockResolvedValue(1);
      mockPrismaClient.sESION.findMany.mockResolvedValue(mockSesiones);

      // Act
      const resultado = await service.listarSesionesPacientePorCuidador(
        idPaciente, 
        idCuidador, 
        sesionPaginationDto as any
      );

      // Assert
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('meta');
      expect(resultado.data).toEqual(mockSesiones);
      expect(resultado.meta.total).toBe(1);
      expect(mockPrismaClient.sESION.count).toHaveBeenCalledWith({
        where: {
          idPaciente: 'uuid-paciente',
          idCuidador: 'uuid-cuidador',
        }
      });
    });

    it('debe filtrar por estado_sesion cuando se proporciona', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      const idCuidador = 'uuid-cuidador';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
        estado_sesion: 'completado',
      };

      // Mock validaciones
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: 'uuid-paciente' }] 
      }));
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: 'uuid-cuidador' }] 
      }));

      mockPrismaClient.sESION.count.mockResolvedValue(0);
      mockPrismaClient.sESION.findMany.mockResolvedValue([]);

      // Act
      await service.listarSesionesPacientePorCuidador(
        idPaciente, 
        idCuidador, 
        sesionPaginationDto as any
      );

      // Assert
      expect(mockPrismaClient.sESION.count).toHaveBeenCalledWith({
        where: {
          idPaciente: 'uuid-paciente',
          idCuidador: 'uuid-cuidador',
          estado: 'completado',
        }
      });
    });

    it('debe lanzar excepción si idPaciente no es de un paciente', async () => {
      // Arrange
      const idPaciente = 'uuid-cuidador';
      const idCuidador = 'uuid-cuidador';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
      };

      // Mock validación - retorna cuidador en lugar de paciente
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'cuidador', idUsuario: 'uuid-cuidador' }] 
      }));

      // Act & Assert
      await expect(
        service.listarSesionesPacientePorCuidador(idPaciente, idCuidador, sesionPaginationDto as any)
      ).rejects.toThrow(RpcException);
    });

    it('debe lanzar excepción si idCuidador no es de un cuidador o administrador', async () => {
      // Arrange
      const idPaciente = 'uuid-paciente';
      const idCuidador = 'uuid-otro-paciente';
      const sesionPaginationDto = {
        page: 1,
        limit: 10,
      };

      // Mock validación de paciente - OK
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: 'uuid-paciente' }] 
      }));

      // Mock validación de cuidador - retorna paciente
      mockNatsClient.send.mockReturnValueOnce(of({ 
        usuarios: [{ rol: 'paciente', idUsuario: 'uuid-otro-paciente' }] 
      }));

      // Act & Assert
      await expect(
        service.listarSesionesPacientePorCuidador(idPaciente, idCuidador, sesionPaginationDto as any)
      ).rejects.toThrow(RpcException);
    });
  });
});
