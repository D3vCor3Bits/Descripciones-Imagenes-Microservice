import { estado_sesion } from '@prisma/client';
import {IsNumber, IsEnum} from 'class-validator';
import { estadoListDto } from '../enum/estado.enum';

export class CrearSesionDto{

    @IsNumber()
    idPaciente: number

    fechaInicio: Date

    @IsEnum(estadoListDto, {
        message: `Los status válidos son: ${estadoListDto}`
    })
    estado: estado_sesion

    @IsNumber()
    sessionRecall: number

    @IsNumber()
    sessionComision: number

    @IsNumber()
    sessionCoherencia: number

    @IsNumber()
    sessionTotal: number
}