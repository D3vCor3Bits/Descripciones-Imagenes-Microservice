import {IsString } from "class-validator";
import { PaginationDto } from "src/common";


export class ImagenPaginationDto extends PaginationDto{
    @IsString()
    cuidadorId: string;
}