import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    DATABASE_URL: string;
    CLOUDINARY_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string
    NATS_SERVERS: string [];
    GEMINI_API_KEY: string;
}

const envsSchema = joi.object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    CLOUDINARY_NAME: joi.string().required(),
    CLOUDINARY_API_KEY: joi.string().required(),
    CLOUDINARY_API_SECRET: joi.string().required(),
    GEMINI_API_KEY: joi.string().required(),

    NATS_SERVERS: joi.array().items(joi.string()).required()
}).unknown(true);

const {error, value} = envsSchema.validate({
    ...process.env,
    NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});

if (error){
    throw new Error(`Config validation error: ${error.message}`)
}

const envVars: EnvVars = value;

export const envs = {
    port: envVars.PORT,
    databaseUrl: envVars.DATABASE_URL,
    cloudinaryName: envVars.CLOUDINARY_NAME,
    cloudinaryApiKey: envVars.CLOUDINARY_API_KEY,
    cloudinarySecret: envVars.CLOUDINARY_API_SECRET,
    natsServers: envVars.NATS_SERVERS,
    geminiApiKey: envVars.GEMINI_API_KEY
}