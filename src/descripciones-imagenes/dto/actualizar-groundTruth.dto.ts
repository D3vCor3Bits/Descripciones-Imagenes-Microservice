import { PartialType } from "@nestjs/mapped-types";
import { CrearGroundTruthDto } from "./crear-groundTruth.dto";
import { IsNumber, IsPositive } from "class-validator";


export class ActualizarGroundTruthDto extends PartialType(CrearGroundTruthDto){
    @IsNumber()
    @IsPositive()
    id: number;
}