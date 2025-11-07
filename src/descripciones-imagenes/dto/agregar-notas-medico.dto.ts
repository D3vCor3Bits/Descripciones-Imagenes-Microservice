import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class AgregarNotasMedicoDto {
  @IsNumber()
  @IsPositive()
  idSesion: number;

  @IsString()
  @IsNotEmpty()
  notasMedico: string;
}
