// Lista de logros. Para agregar uno nuevo, añade un objeto a LOGROS:
//   id          nombre único (se guarda en el progreso del usuario)
//   grupo       'quices' o 'captura' (decide en qué sección se muestra)
//   nombre      título corto
//   descripcion cómo se consigue
//   cumple(p)   true cuando el progreso p ya lo merece
//   avance(p)   (opcional) [actual, meta] para mostrar "2 / 3" mientras está bloqueado
//   super       (opcional) true = se destaca como superlogro
//   imagen      (opcional) ilustración que se ve en la medalla
//   simbolo     (opcional) texto corto dentro de la medalla si no hay imagen
//
// Los logros se calculan a partir del progreso (capturas y quices), así que
// si cambias una regla aquí, el cambio vale también para quien ya jugó.
import { AVES } from './aves.js'
import { avesConQuiz } from './quiz.js'

const TOTAL = AVES.length

const logrosDeQuiz = avesConQuiz(AVES).map((a) => ({
  id: `quiz-${a.id}`,
  grupo: 'quices',
  nombre: `Experto en ${a.nombre}`,
  descripcion: `Aprueba el quiz del ${a.nombre}.`,
  imagen: a.ilustracion,
  cumple: (p) => !!p.quices?.[a.id]?.completado,
}))

export const LOGROS = [
  {
    id: 'super-quiz',
    grupo: 'quices',
    super: true,
    nombre: 'Maestro de las aves del campus',
    descripcion: 'Aprueba el quiz de todas las aves y supera el súper quiz.',
    simbolo: '★',
    cumple: (p) => !!p.quizFinal?.completado,
    avance: (p) => [
      avesConQuiz(AVES).filter((a) => p.quices?.[a.id]?.completado).length + (p.quizFinal?.completado ? 1 : 0),
      avesConQuiz(AVES).length + 1,
    ],
  },
  ...logrosDeQuiz,

  // ----- Captura (en el recorrido) -----
  {
    id: 'primer-avistamiento', // este id ya existía en el progreso
    grupo: 'captura',
    nombre: 'Primer avistamiento',
    descripcion: 'Captura tu primera ave.',
    simbolo: '1',
    cumple: (p) => p.capturadas.length >= 1,
  },
  {
    id: 'observador',
    grupo: 'captura',
    nombre: 'Ojo de halcón',
    descripcion: 'Captura 3 aves distintas.',
    simbolo: '3',
    cumple: (p) => p.capturadas.length >= 3,
    avance: (p) => [Math.min(p.capturadas.length, 3), 3],
  },
  {
    id: 'coleccion-completa',
    grupo: 'captura',
    nombre: 'Colección completa',
    descripcion: `Captura las ${TOTAL} aves del campus.`,
    simbolo: String(TOTAL),
    cumple: (p) => AVES.every((a) => p.capturadas.includes(a.id)),
    avance: (p) => [AVES.filter((a) => p.capturadas.includes(a.id)).length, TOTAL],
  },
]

export const logroPorId = (id) => LOGROS.find((l) => l.id === id)
