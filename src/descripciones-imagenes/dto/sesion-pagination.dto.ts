import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common";
import { estado_sesion, estadoListDto } from "../enum/estado.enum";


export class SesionPaginationDto extends PaginationDto{
    @IsOptional()
    @IsEnum(estadoListDto,{
        message: `Estado válidos: ${estadoListDto}`
    })
    estado_sesion: estado_sesion

    @IsString()
    idPaciente: string
}