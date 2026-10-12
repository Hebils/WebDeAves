// Reglas y ayudas de los quices. Aquí se cambian las reglas del juego sin tocar las pantallas.

// Qué parte de las preguntas hay que acertar para "aprobar".
// Con 0.65: quiz de 3 preguntas -> 2 aciertos; súper quiz de 10 -> 7 aciertos.
export const UMBRAL_APROBADO = 0.65

// Cuántas preguntas de CADA ave entran al súper quiz (se eligen al azar en cada intento).
// Con 5 aves y 2 por ave -> 10 preguntas.
export const PREGUNTAS_POR_AVE_EN_SUPER = 2

// Solo cuentan las aves que ya tienen preguntas (así un ave nueva sin quiz no bloquea el súper quiz)
export const avesConQuiz = (aves) => aves.filter((a) => a.quiz?.length > 0)

export function aciertosParaAprobar(total) {
  return Math.ceil(total * UMBRAL_APROBADO)
}

// Orden al azar (Fisher-Yates)
export function mezclar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// Convierte una pregunta de aves.js en una lista para mostrar.
// Las opciones se barajan para que no se pueda memorizar "la correcta es la A".
// Cada pregunta guarda a qué ave pertenece (en el súper quiz se muestra, porque
// preguntas como "¿Qué come?" no dicen de quién hablan).
function prepararPregunta(p, ave) {
  return {
    texto: p.pregunta,
    ave: { id: ave.id, nombre: ave.nombre },
    opciones: mezclar(p.opciones.map((texto, i) => ({ texto, correcta: i === p.correcta }))),
  }
}

export function prepararQuizDeAve(ave) {
  return ave.quiz.map((p) => prepararPregunta(p, ave))
}

export function armarSuperQuiz(aves) {
  const preguntas = avesConQuiz(aves).flatMap((ave) =>
    mezclar(ave.quiz).slice(0, PREGUNTAS_POR_AVE_EN_SUPER).map((p) => prepararPregunta(p, ave)),
  )
  return mezclar(preguntas)
}
