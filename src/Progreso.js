// Progreso del usuario guardado en localStorage (funciona en GitHub Pages).
// Todo va en try/catch: en modo privado de Safari el almacenamiento puede fallar.
import { useCallback, useState } from 'react'
import { AVES } from './data/aves.js'

const CLAVE = 'webaves-uao-progreso'

const INICIAL = {
  capturadas: ['currucutu', 'torcaza', 'bichofue', 'azulejo', 'gavilan'],        // ['currucutu', 'torcaza']
  quices: {},            // { currucutu: { completado: true, puntaje: 3 } }
  quizFinal: { desbloqueado: false, mejorPuntaje: 0 },
  insignias: [],         // ['primer-avistamiento']
}

export function cargarProgreso() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? { ...INICIAL, ...JSON.parse(crudo) } : { ...INICIAL }
  } catch {
    return { ...INICIAL }
  }
}

function guardarProgreso(p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    /* sin almacenamiento: el progreso dura solo la sesión */
  }
}

// Hook: const { progreso, capturar, completarQuiz, reiniciar } = useProgreso()
export function useProgreso() {
  const [progreso, setProgreso] = useState(cargarProgreso)

  const actualizar = useCallback((fn) => {
    setProgreso((prev) => {
      const sig = fn(prev)
      guardarProgreso(sig)
      return sig
    })
  }, [])

  const capturar = (id) =>
    actualizar((p) => {
      if (p.capturadas.includes(id)) return p
      const insignias = p.insignias.includes('primer-avistamiento')
        ? p.insignias
        : [...p.insignias, 'primer-avistamiento']
      return { ...p, capturadas: [...p.capturadas, id], insignias }
    })

  const completarQuiz = (id, puntaje) =>
    actualizar((p) => {
      const quices = { ...p.quices, [id]: { completado: true, puntaje } }
      const todos = AVES.every((a) => quices[a.id]?.completado)
      return { ...p, quices, quizFinal: { ...p.quizFinal, desbloqueado: todos } }
    })

  const reiniciar = () => actualizar(() => ({ ...INICIAL }))

  return { progreso, capturar, completarQuiz, reiniciar }
}