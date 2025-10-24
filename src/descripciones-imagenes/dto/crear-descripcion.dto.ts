import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";


export class CrearDescriptionDto{

    @IsString()
    texto: string    

    @IsOptional()
    fecha: string

    @IsNumber()
    @IsPositive()
    idPaciente: number

    @IsNumber()
    @IsPositive()
    idImagen: number

    @IsNumber()
    @IsPositive()
    idSesion: number
}