// Setup para pruebas E2E
// Variables de entorno para testing

process.env.PORT = '3001';
process.env.NATS_SERVERS = 'nats://localhost:4222';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/douremember_test';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
