import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Enciclopedia from './Enciclopedia.jsx'
import Quiz from './Quiz.jsx'
import { AVES } from './data/aves.js'
import { armarSuperQuiz, prepararQuizDeAve } from './data/quiz.js'
import { cuantosQuicesAprobados, totalQuices, todosLosQuicesAprobados, useProgreso } from './Progreso.js'

/* Junta los datos con la pantalla:
   - las aves (aves.js)
   - lo que el usuario ya capturó y los quices que ya hizo (Progreso.js)
   Y le pasa todo a Enciclopedia (o a Quiz cuando hay un quiz abierto).
   Esta es la página Enciclopedia.html, igual que el aviario. */
function ConexionEnciclopedia() {
  const { progreso, completarQuiz, completarSuperQuiz } = useProgreso()
  const [seleccionId, setSeleccionId] = useState(null) // ave abierta (null = ninguna)

  // Quiz abierto (null = ninguno): { tipo: 'ave' | 'super', ave?, preguntas, intento }
  // Las preguntas se arman al abrir, no al dibujar, para que no cambien a mitad del quiz.
  const [quizActivo, setQuizActivo] = useState(null)

  const seleccionada = AVES.find((a) => a.id === seleccionId) ?? null

  // Cada cambio de pantalla empieza arriba (si no, la página queda en el punto donde estaba el scroll)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [seleccionId, quizActivo?.tipo, quizActivo?.intento])

  // Ir al ave anterior (-1) o a la siguiente (1)
  function navegar(paso) {
    const i = AVES.findIndex((a) => a.id === seleccionId)
    const nueva = AVES[i + paso]
    if (nueva) setSeleccionId(nueva.id)
  }

  // Volver a la portada: si hay página anterior, se usa "atrás";
  // si no (abrieron esta página directo), se abre la portada
  function volverAlInicio() {
    if (window.history.length > 1) window.history.back()
    else window.open(import.meta.env.BASE_URL, '_self')
  }

  // ---------- Quices ----------
  function abrirQuizDeAve(id) {
    const ave = AVES.find((a) => a.id === id)
    if (!ave?.quiz?.length) return
    setQuizActivo({ tipo: 'ave', ave, preguntas: prepararQuizDeAve(ave), intento: 1 })
  }

  function abrirSuperQuiz() {
    if (!todosLosQuicesAprobados(progreso)) return // doble seguro: el botón gris ya no se puede tocar
    setQuizActivo({ tipo: 'super', preguntas: armarSuperQuiz(AVES), intento: 1 })
  }

  // Otro intento: preguntas nuevas (y en otro orden)
  function reintentar() {
    setQuizActivo((q) => ({
      ...q,
      preguntas: q.tipo === 'super' ? armarSuperQuiz(AVES) : prepararQuizDeAve(q.ave),
      intento: q.intento + 1,
    }))
  }

  function terminarQuiz(aciertos, total) {
    return quizActivo.tipo === 'super'
      ? completarSuperQuiz(aciertos, total)
      : completarQuiz(quizActivo.ave.id, aciertos, total)
  }

  if (quizActivo) {
    return (
      <Quiz
        key={`${quizActivo.tipo}-${quizActivo.ave?.id ?? ''}-${quizActivo.intento}`}
        esSuper={quizActivo.tipo === 'super'}
        ave={quizActivo.ave}
        preguntas={quizActivo.preguntas}
        onTerminar={terminarQuiz}
        onReintentar={reintentar}
        onSalir={() => setQuizActivo(null)} // vuelve a la ficha del ave o a la colección
        onIrAColeccion={() => {
          setQuizActivo(null)
          setSeleccionId(null)
        }}
      />
    )
  }

  return (
    <Enciclopedia
      aves={AVES}
      capturadas={progreso.capturadas ?? []}
      quices={progreso.quices ?? {}}
      superQuiz={{
        desbloqueado: todosLosQuicesAprobados(progreso),
        completado: !!progreso.quizFinal?.completado,
        mejorPuntaje: progreso.quizFinal?.mejorPuntaje ?? 0,
        aprobados: cuantosQuicesAprobados(progreso),
        total: totalQuices(),
      }}
      seleccionada={seleccionada}
      onSeleccionar={setSeleccionId}
      onCerrar={() => setSeleccionId(null)}
      onNavegar={navegar}
      onVolver={volverAlInicio}
      onIniciar={volverAlInicio}
      onQuiz={abrirQuizDeAve}
      onSuperQuiz={abrirSuperQuiz}
    />
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConexionEnciclopedia />
  </StrictMode>,
)
