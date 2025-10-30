import { IsNotEmpty, IsOptional, IsString } from "class-validator";


export class GetAIresponseDto{
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @IsString()
    @IsOptional()
    sessionId?: string
}