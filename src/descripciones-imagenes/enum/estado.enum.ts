import {estado_sesion} from "@prisma/client"

export const estadoListDto = [
    estado_sesion.completado,
    estado_sesion.en_curso,
    estado_sesion.pendiente
]