import { PartialType } from '@nestjs/mapped-types';
import { CrearSesionDto } from './crear-sesion.dto';
import { IsNumber, IsPositive } from 'class-validator';


export class ActualizarSesionDto extends PartialType(CrearSesionDto){
    @IsNumber()
    @IsPositive()
    id: number;
}