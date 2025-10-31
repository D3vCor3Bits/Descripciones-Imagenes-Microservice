import {IsNumber, IsString, IsPositive, IsDateString, IsArray} from 'class-validator';


export class CrearGroundTruthDto{

    @IsString()
    texto: string;

    @IsNumber()
    @IsPositive()
    idImagen: number;

    @IsArray()
    palabrasClave: string[];

    @IsArray()
    preguntasGuiaPaciente: string[];
}