// Progreso del usuario guardado en localStorage (funciona en GitHub Pages).
// Todo va en try/catch: en modo privado de Safari el almacenamiento puede fallar.
import { useCallback, useRef, useState } from 'react'
import { AVES } from './data/aves.js'
import { LOGROS } from './data/logros.js'
import { PREGUNTAS_POR_AVE_EN_SUPER, aciertosParaAprobar, avesConQuiz } from './data/quiz.js'

const CLAVE = 'webaves-uao-progreso'

const INICIAL = {
  capturadas: [], // ids de aves capturadas, ['currucutu', 'torcaza']
  // { currucutu: { completado: true, puntaje: 3, intentos: 2 } }
  //   completado = ya aprobó alguna vez (no se pierde si luego reprueba un intento)
  //   puntaje    = mejor puntaje
  quices: {},
  // desbloqueado: se calcula solo (todos los quices aprobados)
  // completado: ya superó el súper quiz alguna vez
  quizFinal: { desbloqueado: false, completado: false, mejorPuntaje: 0, intentos: 0 },
  insignias: [], // ids de logros ya ganados, ['primer-avistamiento']
}

// ---------- Reglas derivadas ----------

// ¿Aprobó el quiz de todas las aves? -> se abre el súper quiz
export const todosLosQuicesAprobados = (p) => avesConQuiz(AVES).every((a) => p.quices?.[a.id]?.completado)

export const cuantosQuicesAprobados = (p) => avesConQuiz(AVES).filter((a) => p.quices?.[a.id]?.completado).length
export const totalQuices = () => avesConQuiz(AVES).length

// Deja el progreso coherente: marca el súper quiz como desbloqueado y
// agrega a "insignias" los logros que ya se cumplen. Si no cambia nada, devuelve el mismo objeto.
function normalizar(p) {
  const desbloqueado = todosLosQuicesAprobados(p)
  const ganados = LOGROS.filter((l) => l.cumple(p)).map((l) => l.id)
  const nuevas = ganados.filter((id) => !p.insignias.includes(id))
  if (desbloqueado === !!p.quizFinal.desbloqueado && nuevas.length === 0) return p
  return {
    ...p,
    quizFinal: { ...p.quizFinal, desbloqueado },
    insignias: [...p.insignias, ...nuevas],
  }
}

export function cargarProgreso() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const guardado = crudo ? JSON.parse(crudo) : {}
    return normalizar({
      ...INICIAL,
      ...guardado,
      quizFinal: { ...INICIAL.quizFinal, ...guardado.quizFinal },
    })
  } catch {
    return normalizar({ ...INICIAL })
  }
}

function guardarProgreso(p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    /* sin almacenamiento: el progreso dura solo la sesión */
  }
}

// Hook: const { progreso, capturar, completarQuiz, completarSuperQuiz, reiniciar, dev } = useProgreso()
export function useProgreso() {
  const [progreso, setProgreso] = useState(cargarProgreso)
  const actual = useRef(progreso) // siempre el progreso más reciente, para devolver resultados al instante

  // Aplica un cambio, lo guarda y avisa qué logros nuevos se ganaron con ese cambio.
  const actualizar = useCallback((fn) => {
    const antes = actual.current
    const despues = normalizar(fn(antes))
    if (despues === antes) return { antes, despues, nuevas: [] }
    actual.current = despues
    guardarProgreso(despues)
    setProgreso(despues)
    return { antes, despues, nuevas: despues.insignias.filter((id) => !antes.insignias.includes(id)) }
  }, [])

  const capturar = (id) =>
    actualizar((p) => (p.capturadas.includes(id) ? p : { ...p, capturadas: [...p.capturadas, id] })).nuevas

  // Guarda el resultado de un quiz de un ave.
  // Devuelve { aprobado, nuevas, superDesbloqueadoAhora } para mostrarlo en la pantalla de resultado.
  const completarQuiz = (id, puntaje, total) => {
    const aprobado = puntaje >= aciertosParaAprobar(total)
    const r = actualizar((p) => {
      const previo = p.quices[id]
      return {
        ...p,
        quices: {
          ...p.quices,
          [id]: {
            completado: aprobado || !!previo?.completado,
            puntaje: Math.max(puntaje, previo?.puntaje ?? 0),
            intentos: (previo?.intentos ?? 0) + 1,
          },
        },
      }
    })
    return {
      aprobado,
      nuevas: r.nuevas,
      superDesbloqueadoAhora: !todosLosQuicesAprobados(r.antes) && todosLosQuicesAprobados(r.despues),
    }
  }

  // Guarda el resultado del súper quiz (solo se puede jugar con todos los quices aprobados).
  const completarSuperQuiz = (puntaje, total) => {
    const aprobado = puntaje >= aciertosParaAprobar(total)
    const r = actualizar((p) => ({
      ...p,
      quizFinal: {
        ...p.quizFinal,
        completado: aprobado || !!p.quizFinal.completado,
        mejorPuntaje: Math.max(puntaje, p.quizFinal.mejorPuntaje ?? 0),
        intentos: (p.quizFinal.intentos ?? 0) + 1,
      },
    }))
    return { aprobado, nuevas: r.nuevas, superDesbloqueadoAhora: false }
  }

  // ---------- SOLO DESARROLLO (las usa el panel secreto del menú, ver screens/PanelDev.jsx) ----------
  const todasLasAves = () => AVES.map((a) => a.id)

  const aprobarTodosLosQuices = (p) => ({
    ...p,
    capturadas: todasLasAves(), // no se puede aprobar el quiz de un ave que no tienes
    quices: Object.fromEntries(
      avesConQuiz(AVES).map((a) => [
        a.id,
        { completado: true, puntaje: a.quiz.length, intentos: Math.max(1, p.quices[a.id]?.intentos ?? 0) },
      ]),
    ),
  })

  const dev = {
    desbloquearAves: () => actualizar((p) => ({ ...p, capturadas: todasLasAves() })),

    // Aprueba todos los quices (abre el súper quiz, pero sin superarlo)
    aprobarQuices: () => actualizar(aprobarTodosLosQuices),

    // Todo: aves, quices y súper quiz superado
    desbloquearLogros: () =>
      actualizar((p) => {
        const q = aprobarTodosLosQuices(p)
        return {
          ...q,
          quizFinal: {
            ...q.quizFinal,
            completado: true,
            mejorPuntaje: Math.max(q.quizFinal.mejorPuntaje ?? 0, avesConQuiz(AVES).length * PREGUNTAS_POR_AVE_EN_SUPER),
            intentos: Math.max(1, q.quizFinal.intentos ?? 0),
          },
        }
      }),

    // Captura o libera una sola ave (captura "de prueba")
    alternarCaptura: (id) =>
      actualizar((p) => ({
        ...p,
        capturadas: p.capturadas.includes(id) ? p.capturadas.filter((x) => x !== id) : [...p.capturadas, id],
      })),
  }

  const reiniciar = () => actualizar(() => ({ ...INICIAL }))

  return { progreso, capturar, completarQuiz, completarSuperQuiz, reiniciar, dev }
}
