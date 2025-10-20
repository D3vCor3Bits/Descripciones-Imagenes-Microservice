import {IsNumber, IsString, IsPositive, IsArray, ArrayMinSize, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import { ImagenItemDto } from './imagen-item.dto';


export class CrearImagenDto{
    
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({each: true})
    @Type(()=> ImagenItemDto)
    imagenes: ImagenItemDto[]
}