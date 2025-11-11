<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Microservicio de Descripciones e Imágenes para Douremember. Este servicio gestiona el flujo completo de sesiones de descripción de imágenes, incluyendo la carga de imágenes a Cloudinary, la gestión de ground truths, y la evaluación de descripciones mediante IA (Google Gemini).

## Características

- 🖼️ Carga de imágenes a Cloudinary
- 📝 Gestión de descripciones de pacientes
- 🎯 Manejo de ground truths (verdades absolutas)
- 🧠 Evaluación de descripciones usando Google Gemini AI
- 📊 Generación de puntajes y métricas cognitivas
- 🔄 Gestión de sesiones de evaluación
- 🔌 Integración con NATS para comunicación entre microservicios
- 🗄️ Persistencia en PostgreSQL usando Prisma ORM

## Variables de Entorno

Crea un archivo `.env` basado en `.env.template`:

```bash
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/database

# NATS Configuration
NATS_SERVERS=nats://localhost:4222

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

## Requisitos Previos

### Servidor NATS

Es **importante** tener un servidor NATS corriendo en Docker:

```bash
docker run -d --name nats-main -p 4222:4222 -p 8222:8222 nats
```

Este comando levanta un contenedor NATS que expone:
- Puerto `4222`: Para conexiones de clientes
- Puerto `8222`: Para monitoreo HTTP

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
$ npm run start:dev
```

## Estructura del Proyecto

```
src/
├── descripciones-imagenes/
│   ├── dto/                    # Data Transfer Objects
│   ├── interfaces/             # Interfaces de tipos
│   ├── descripciones-imagenes.controller.ts
│   └── descripciones-imagenes.service.ts
├── config/
│   └── envs.ts                 # Configuración de variables de entorno
└── transports/
    └── nats.module.ts          # Configuración de NATS
```

## Prisma

Este proyecto usa Prisma ORM. Comandos útiles:

```bash
# Sincronizar el schema con la base de datos
npx prisma db pull

# Generar el cliente de Prisma
npx prisma generate
```

### Vista VW_PromediosPorSesion

**Importante:** Después de hacer `npx prisma db pull`, debes agregar manualmente la siguiente vista en el archivo `schema.prisma`:

```prisma
model VW_PromediosPorSesion {
  idSesion              Int     @id           @map("idSesion")
  PromedioOmision       Float?  @map("PromedioOmision")
  PromedioComision      Float?  @map("PromedioComision")
  PromedioExactitud     Float?  @map("PromedioExactitud")
  PromedioCoherencia    Float?  @map("PromedioCoherencia")
  PromedioFluidez       Float?  @map("PromedioFluidez")
  PuntajeTotalPromedio  Float?  @map("PuntajeTotalPromedio")

  @@map("VW_PromediosPorSesion") 
}
```

Esta vista debe agregarse manualmente ya que Prisma no detecta vistas automáticamente al hacer el pull de la base de datos.
