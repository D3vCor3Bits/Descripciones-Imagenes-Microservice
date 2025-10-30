import { PartialType } from "@nestjs/mapped-types";
import { CrearGroundTruthDto } from "./crear-groundTruth.dto";


export class ActualizarGroundTruthDto extends PartialType(CrearGroundTruthDto){
    id: number;
}