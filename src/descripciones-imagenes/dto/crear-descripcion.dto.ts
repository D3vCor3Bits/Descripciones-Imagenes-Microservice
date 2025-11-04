import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";


export class CrearDescriptionDto{

    @IsString()
    texto: string    

    @IsOptional()
    fecha: string

    @IsString()
    idPaciente: string

    @IsNumber()
    @IsPositive()
    idImagen: number
}