import { estado_sesion } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "src/common";
import { estadoListDto } from "../enum/estado.enum";


export class SesionPaginationDto extends PaginationDto{
    @IsOptional()
    @IsEnum(estadoListDto,{
        message: `Estado válidos: ${estadoListDto}`
    })
    estado_sesion: estado_sesion
}