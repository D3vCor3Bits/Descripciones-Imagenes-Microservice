export enum estado_sesion{
    completado = 'completado',
    en_curso = 'en_curso',
    pendiente = 'pendiente'
}

export const estadoListDto = [
    estado_sesion.completado,
    estado_sesion.en_curso,
    estado_sesion.pendiente
]