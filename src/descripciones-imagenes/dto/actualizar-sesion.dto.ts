import { PartialType } from '@nestjs/mapped-types';
import { CrearSesionDto } from './crear-sesion.dto';


export class ActualizarSesionDto extends PartialType(CrearSesionDto){
    id: number;
}