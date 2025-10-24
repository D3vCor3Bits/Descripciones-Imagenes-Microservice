import { IsArray, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";


export class crearPuntajeDto{

    @IsNumber()
    @IsPositive()
    idDescripcion: number
    
    @IsNumber()
    @IsPositive()
    rateOmision: number

    @IsNumber()
    @IsPositive()
    rateComision: number

    @IsNumber()
    @IsPositive()
    rateExactitud: number

    @IsNumber()
    @IsPositive()
    puntajeCoherencia: number

    @IsNumber()
    @IsPositive()
    puntajeFluidez: number

    @IsNumber()
    @IsPositive()
    puntajeTotal: number

    @IsArray()
    detallesOmitidos:string[]

    @IsArray()
    palabrasClaveOmitidas: string[]

    @IsArray()
    aciertos: string[]

    @IsString()
    conclusion: string

    @IsOptional()
    fechaCalculado: Date
}