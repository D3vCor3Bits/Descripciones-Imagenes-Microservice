// Setup de variables de entorno para testing
process.env.PORT = '3002';
process.env.NATS_SERVERS = 'nats://localhost:4222';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.CLOUDINARY_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

// Silenciar logs de NestJS en tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
