import { PartialType } from "@nestjs/mapped-types"
import { ImagenItemDto } from "./imagen-item.dto"
import { IsNumber, IsPositive } from "class-validator"

export class ActualizarImagenDto extends PartialType(ImagenItemDto){
    @IsNumber()
    @IsPositive()
    idImagen : number
}