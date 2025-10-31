export function calcularDiferenciaHoraria(fechaSubida: Date){
    const now = new Date();
    const fechaUp = new Date(fechaSubida);
    const diffMs = now.getTime() - fechaUp.getTime();
    const HOURS_24_MS = 24 * 60 * 60 * 1000;
    return{
      diffMs,
      HOURS_24_MS
    }
}