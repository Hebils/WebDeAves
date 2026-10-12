import { useEffect, useRef, useState } from 'react'
import './Enciclopedia.css' // misma base visual (botones, tarjetas, barra de progreso)
import './Quiz.css'
import { aciertosParaAprobar } from './data/quiz.js'
import { logroPorId } from './data/logros.js'

/* Pantalla de quiz. Sirve para el quiz de un ave y para el súper quiz.
   Solo muestra y recoge respuestas; guardar el progreso lo hace ConexionEnciclopedia.

   Props:
   - esSuper        true = súper quiz (muestra de qué ave habla cada pregunta)
   - ave            el ave (solo en el quiz individual)
   - preguntas      lista ya preparada (ver data/quiz.js)
   - onTerminar(aciertos, total) -> { aprobado, nuevas, superDesbloqueadoAhora }
   - onReintentar   empieza otro intento con preguntas nuevas
   - onSalir        vuelve a donde estabas (ficha del ave o colección)
   - onIrAColeccion vuelve a la colección (se usa al desbloquear el súper quiz)
*/
export default function Quiz({ esSuper, ave, preguntas, onTerminar, onReintentar, onSalir, onIrAColeccion }) {
  const total = preguntas.length
  const minimo = aciertosParaAprobar(total)

  const [indice, setIndice] = useState(0)
  const [elegida, setElegida] = useState(null)   // posición de la opción tocada (null = aún no responde)
  const [respuestas, setRespuestas] = useState([]) // [true, false, ...] una por pregunta contestada
  const [resultado, setResultado] = useState(null) // null mientras juega
  const [confirmando, setConfirmando] = useState(false)

  const botonSiguiente = useRef(null)
  const botonSeguir = useRef(null)
  const tituloResultado = useRef(null)

  const pregunta = preguntas[indice]
  const respondida = elegida !== null
  const aciertos = respuestas.filter(Boolean).length
  const hayAvance = !resultado && (indice > 0 || respondida)

  // Al responder, el foco pasa a "Siguiente" (así se sigue con teclado o lector de pantalla)
  useEffect(() => {
    if (respondida) botonSiguiente.current?.focus()
  }, [respondida])

  useEffect(() => {
    if (confirmando) botonSeguir.current?.focus()
  }, [confirmando])

  useEffect(() => {
    if (resultado) tituloResultado.current?.focus()
  }, [resultado])

  function elegir(posicion) {
    if (respondida) return
    setElegida(posicion)
    setRespuestas((r) => [...r, pregunta.opciones[posicion].correcta])
  }

  function siguiente() {
    if (indice < total - 1) {
      setIndice(indice + 1)
      setElegida(null)
    } else {
      setResultado(onTerminar(aciertos, total))
    }
  }

  function pedirSalir() {
    if (hayAvance) setConfirmando(true)
    else onSalir()
  }

  const titulo = esSuper ? 'Súper quiz' : `Quiz: ${ave.nombre}`
  const subtitulo = esSuper ? `${total} preguntas de todas las aves` : `${total} preguntas`
  const avance = resultado ? total : indice + (respondida ? 1 : 0)

  return (
    <main className="enc qz">
      <header className="enc-barra">
        <button type="button" className="enc-btn-icono" onClick={pedirSalir} aria-label="Salir del quiz">←</button>
        <span className="enc-barra-titulo">
          {resultado ? 'Resultado' : `Pregunta ${indice + 1} de ${total}`}
        </span>
      </header>

      {confirmando && (
        <div className="qz-confirmar" role="group" aria-label="Confirmar salida">
          <p>¿Salir del quiz? Perderás lo que llevas.</p>
          <div className="qz-confirmar-botones">
            <button type="button" ref={botonSeguir} className="enc-btn enc-btn--amarillo" onClick={() => setConfirmando(false)}>Seguir en el quiz</button>
            <button type="button" className="enc-btn" onClick={onSalir}>Salir</button>
          </div>
        </div>
      )}

      <div className="qz-cab">
        <div className="qz-cab-fila">
          <span className="qz-cab-img" aria-hidden="true">
            {esSuper ? <IconoEstrella /> : <Miniatura src={ave.ilustracion} />}
          </span>
          <div>
            <h1>{titulo}</h1>
            <p>{subtitulo}</p>
          </div>
        </div>
        <div
          className="enc-progreso"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={avance}
          aria-label="Avance del quiz"
        >
          <i style={{ width: `${(avance / total) * 100}%` }} />
        </div>
      </div>

      {!resultado ? (
        /* ===================== PREGUNTA ===================== */
        <article className="enc-info qz-pregunta" key={indice}>
          {esSuper && <span className="qz-chip">Sobre: {pregunta.ave.nombre}</span>}
          <h2 className="qz-texto" id="qz-texto">{pregunta.texto}</h2>

          <div className="qz-opciones" role="group" aria-labelledby="qz-texto">
            {pregunta.opciones.map((o, i) => {
              const esLaElegida = elegida === i
              let estado = ''
              if (respondida) {
                if (o.correcta) estado = 'qz-op--ok'
                else if (esLaElegida) estado = 'qz-op--mal'
                else estado = 'qz-op--apagada'
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={`qz-op ${estado}`}
                  aria-disabled={respondida}
                  onClick={() => elegir(i)}
                >
                  <span className="qz-op-letra" aria-hidden="true">{'ABCD'[i]}</span>
                  <span className="qz-op-texto">{o.texto}</span>
                  {respondida && o.correcta && <span className="qz-op-marca" aria-label="Respuesta correcta">✓</span>}
                  {respondida && esLaElegida && !o.correcta && <span className="qz-op-marca" aria-label="Tu respuesta, incorrecta">✕</span>}
                </button>
              )
            })}
          </div>

          <p className={`qz-feedback ${respondida ? (pregunta.opciones[elegida].correcta ? 'qz-feedback--ok' : 'qz-feedback--mal') : ''}`} role="status">
            {respondida && (pregunta.opciones[elegida].correcta
              ? '¡Correcto!'
              : `Esa no era. La respuesta correcta está marcada en verde.`)}
          </p>

          {respondida && (
            <div className="enc-acciones">
              <button type="button" ref={botonSiguiente} className="enc-btn enc-btn--amarillo" onClick={siguiente}>
                {indice < total - 1 ? 'Siguiente' : 'Ver resultado'}
              </button>
            </div>
          )}
        </article>
      ) : (
        /* ===================== RESULTADO ===================== */
        <article className="enc-info qz-resultado">
          <p className={`qz-sello ${resultado.aprobado ? 'qz-sello--ok' : ''}`}>
            {resultado.aprobado ? (esSuper ? 'Súper quiz superado' : 'Quiz aprobado') : 'Aún no aprobado'}
          </p>
          <h2 className="qz-puntaje" ref={tituloResultado} tabIndex={-1} aria-label={`${aciertos} aciertos de ${total}`}>
            <strong>{aciertos}</strong><span> / {total}</span>
          </h2>
          <div className="qz-puntos" aria-hidden="true">
            {respuestas.map((ok, i) => <i key={i} className={ok ? 'qz-punto' : 'qz-punto qz-punto--mal'} />)}
          </div>
          <p className="enc-texto qz-mensaje">
            {aciertos === total
              ? '¡Perfecto! No fallaste ninguna.'
              : resultado.aprobado
                ? '¡Bien hecho! Superaste el quiz.'
                : `Necesitas ${minimo} aciertos para aprobar. Puedes volver a intentarlo.`}
          </p>

          {resultado.superDesbloqueadoAhora && (
            <div className="qz-banner">
              <strong>¡Súper quiz desbloqueado!</strong>
              <span>Ya aprobaste el quiz de todas las aves.</span>
            </div>
          )}

          {resultado.nuevas.length > 0 && (
            <ul className="qz-logros" aria-label="Logros nuevos">
              {resultado.nuevas.map((id) => {
                const l = logroPorId(id)
                return l && (
                  <li className="qz-logro" key={id}>
                    <span className="qz-logro-medalla" aria-hidden="true">★</span>
                    <span>
                      <small>Logro nuevo</small>
                      <strong>{l.nombre}</strong>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="enc-acciones">
            {resultado.superDesbloqueadoAhora ? (
              <>
                <button type="button" className="enc-btn enc-btn--amarillo" onClick={onIrAColeccion}>Ir a la colección</button>
                <button type="button" className="enc-btn" onClick={onReintentar}>Repetir este quiz</button>
              </>
            ) : resultado.aprobado ? (
              <>
                <button type="button" className="enc-btn enc-btn--amarillo" onClick={onSalir}>
                  {esSuper ? 'Volver a la colección' : 'Volver a la ficha'}
                </button>
                <button type="button" className="enc-btn" onClick={onReintentar}>
                  {esSuper ? 'Jugar otra vez' : 'Repetir el quiz'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="enc-btn enc-btn--amarillo" onClick={onReintentar}>Volver a intentar</button>
                <button type="button" className="enc-btn" onClick={onSalir}>
                  {esSuper ? 'Volver a la colección' : 'Volver a la ficha'}
                </button>
              </>
            )}
          </div>
        </article>
      )}
    </main>
  )
}

// Ilustración del ave; si el archivo no existe, no se muestra nada (queda el recuadro)
function Miniatura({ src }) {
  const [falla, setFalla] = useState(false)
  if (!src || falla) return null
  return <img src={src} alt="" onError={() => setFalla(true)} />
}

function IconoEstrella() {
  return (
    <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  )
}
