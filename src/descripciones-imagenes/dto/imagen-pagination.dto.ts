import { IsNumber, IsPositive } from "class-validator";
import { PaginationDto } from "src/common";


export class ImagenPaginationDto extends PaginationDto{
    @IsNumber()
    @IsPositive()
    cuidadorId: number;
}