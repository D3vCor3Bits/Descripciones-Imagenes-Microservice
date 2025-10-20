import {IsNumber, IsString, IsPositive, IsDateString} from 'class-validator';


export class CrearGroundTruthDto{

    @IsString()
    texto: string;

    @IsNumber()
    @IsPositive()
    idCuidador: number;

    @IsNumber()
    @IsPositive()
    idImagen: number;
}