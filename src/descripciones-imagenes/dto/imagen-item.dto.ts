import {IsNumber, IsString, IsPositive} from 'class-validator';


export class ImagenItemDto{

    @IsString()
    urlImagen: string;


    fechaSubida: Date;

    @IsString()
    idCuidador: string;

    @IsString()
    idAsset: string;

    @IsString()
    idPublicImage: string;

    @IsNumber()
    idSesion: number | null;

    @IsString()
    formato: string;
}