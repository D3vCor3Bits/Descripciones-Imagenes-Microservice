import { IsNumber, IsPositive } from "class-validator";
import { PaginationDto } from "src/common";

export class DescripcionPaginationDto extends PaginationDto{
    @IsNumber()
    @IsPositive()
    idSesion: number
}