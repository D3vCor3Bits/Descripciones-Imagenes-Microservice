import { estado_sesion } from '@prisma/client';
import {IsNumber, IsEnum, IsString, IsOptional, IsArray} from 'class-validator';
import { estadoListDto } from '../enum/estado.enum';

export class CrearSesionDto{

    @IsString()
    idCuidador: string

    @IsOptional()
    fechaInicio: Date

    @IsEnum(estadoListDto, {
        message: `Los status válidos son: ${estadoListDto}`
    })
    @IsOptional()
    estado: estado_sesion

    @IsNumber()
    @IsOptional()
    sessionRecall: number 

    @IsNumber()
    @IsOptional()
    sessionComision: number

    @IsNumber()
    @IsOptional()
    sessionOmision: number

    @IsNumber()
    @IsOptional()
    sessionCoherencia: number

    @IsNumber()
    @IsOptional()
    sessionFluidez: number

    @IsNumber()
    @IsOptional()
    sessionTotal: number

    @IsString()
    @IsOptional()
    conclusionTecnica: string

    @IsString()
    @IsOptional()
    conclusionNormal: string

    @IsArray()
    imagenesIds: number[]
}