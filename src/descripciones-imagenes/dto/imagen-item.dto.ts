import {IsNumber, IsString, IsPositive} from 'class-validator';


export class ImagenItemDto{

    @IsString()
    urlImagen: string;

    fechaSubida: Date;

    @IsNumber()
    @IsPositive()
    idCuidador: number;

    @IsString()
    idAsset: string;

    @IsString()
    idPublicImage: string;

    @IsString()
    formato: string;
}