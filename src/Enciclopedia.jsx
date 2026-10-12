import { useState, useEffect, useRef } from 'react'
import './Enciclopedia.css'

/* Esta pantalla solo muestra cosas.
   Los datos y el progreso llegan desde ConexionEnciclopedia.jsx */
function Enciclopedia({
  aves, capturadas, quices, seleccionada,
  superQuiz, // { desbloqueado, completado, mejorPuntaje, aprobados, total }
  onSeleccionar, onCerrar, onNavegar, onVolver, onIniciar, onQuiz, onSuperQuiz,
}) {
  // ---------- Estados de esta pantalla ----------
  const [vista, setVista] = useState('ilustracion') // 'ilustracion' o 'foto'
  const [sonando, setSonando] = useState(false)     // si el canto está sonando
  const audioRef = useRef(null)

  // ---------- Datos del ave abierta ----------
  const ave = seleccionada
  const indice = ave ? aves.findIndex((a) => a.id === ave.id) : -1
  const capturada = ave ? capturadas.includes(ave.id) : false
  const quizDelAve = ave ? quices[ave.id] : null

  // Imagen grande: viene de aves.js (campo ilustracion o imagen)
  const imagenGrande = ave ? (vista === 'ilustracion' ? ave.ilustracion : ave.imagen) : null

  // ---------- Funciones pequeñas ----------

  // Número del ave: 0 -> "001"
  function numero(i) {
    return String(i + 1).padStart(3, '0')
  }

  // Poner o parar el canto
  function alternarCanto() {
    const canto = ave?.canto
    if (!canto) return
    if (!audioRef.current) {
      audioRef.current = new Audio(canto)
      audioRef.current.addEventListener('ended', () => setSonando(false))
    }
    if (sonando) {
      audioRef.current.pause()
      setSonando(false)
    } else {
      audioRef.current.currentTime = 0
      audioRef.current.play().then(() => setSonando(true)).catch(() => setSonando(false))
    }
  }

  // Cuando cambia el ave: se para el canto y se vuelve a la ilustración
  useEffect(() => {
    setVista('ilustracion')
    setSonando(false)
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [seleccionada?.id])

  // ---------- Pantalla ----------
  return (
    <>
      <main className="enc">
        {ave ? (
          /* ===================== FICHA DEL AVE ===================== */
          <section className="enc-ficha">
            <header className="enc-barra">
              <button type="button" className="enc-btn-icono" onClick={onCerrar} aria-label="Volver a la colección">←</button>
              <span className="enc-barra-titulo">#{numero(indice)}</span>
              <span className="enc-nav">
                <button type="button" className="enc-btn-icono" onClick={() => onNavegar(-1)} disabled={indice === 0} aria-label="Ave anterior">‹</button>
                <button type="button" className="enc-btn-icono" onClick={() => onNavegar(1)} disabled={indice === aves.length - 1} aria-label="Ave siguiente">›</button>
              </span>
            </header>

            {/* IMAGEN GRANDE DEL AVE.
                Viene de aves.js: ave.ilustracion o ave.imagen, según el botón elegido.
                Si falta, se ve el espacio con la nota.
                Si el ave no está capturada, aquí va la silueta. */}
            <div className={`enc-hero ${capturada ? '' : 'enc-hero--bloq'}`}>
              {capturada && imagenGrande ? (
                <img
                  src={imagenGrande}
                  alt={vista === 'ilustracion' ? `Ilustración de ${ave.nombre}` : `Foto de ${ave.nombre}`} style={{ borderRadius: '22px' }} />
              ) : (
                <span className="enc-espacio enc-espacio--grande">
                  {capturada ? (vista === 'ilustracion' ? 'Aquí va la ilustración' : 'Aquí va la foto') : '?'}
                </span>
              )}
            </div>

            {/* Botones para cambiar entre ilustración y foto */}
            {capturada && (
              <div className="enc-tabs" role="group" aria-label="Tipo de imagen">
                <button type="button" className="enc-tab" aria-pressed={vista === 'ilustracion'} onClick={() => setVista('ilustracion')}>Ilustración</button>
                <button type="button" className="enc-tab" aria-pressed={vista === 'foto'} onClick={() => setVista('foto')}>Foto</button>
              </div>
            )}

            {/* Recuadro con la información del ave */}
            <article className="enc-info" key={ave.id}>
              {capturada ? (
                <>
                  <div className="enc-info-cab">
                    <h2 className="enc-nombre">{ave.nombre}</h2>
                    <p className="enc-cientifico">{ave.cientifico}</p>
                  </div>

                  <dl className="enc-datos">
                    <div><dt>Familia</dt><dd>{ave.familia}</dd></div>
                    <div><dt>En inglés</dt><dd>{ave.ingles}</dd></div>
                  </dl>

                  <div className="enc-bloque">
                    <h3>Descripción</h3>
                    <p className="enc-texto">{ave.descripcion}</p>
                  </div>

                  <div className="enc-bloque">
                    <h3>Canto</h3>
                    <button
                      type="button"
                      className={`enc-canto ${sonando ? 'enc-canto--on' : ''}`}
                      onClick={alternarCanto}
                      disabled={!ave.canto}
                    >
                      <span aria-hidden="true">{sonando ? '❚❚' : '▶'}</span>
                      <span>{ave.canto ? (sonando ? 'Parar canto' : 'Escuchar canto') : 'Canto pronto'}</span>
                    </button>
                  </div>

                  <div className="enc-acciones">
                    {ave.quiz?.length > 0 && (
                      <button type="button" className="enc-btn enc-btn--amarillo" onClick={() => onQuiz?.(ave.id)}>
                        {quizDelAve?.completado
                          ? `Repetir quiz (mejor: ${quizDelAve.puntaje}/${ave.quiz.length})`
                          : quizDelAve?.intentos > 0
                            ? `Volver a intentar el quiz (mejor: ${quizDelAve.puntaje}/${ave.quiz.length})`
                            : 'Hacer el quiz'}
                      </button>
                    )}
                    {ave.wikiaves && (
                      <a className="enc-btn" href={ave.wikiaves} target="_blank" rel="noopener noreferrer">
                        Ver en WikiAves ↗
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="enc-info-cab">
                    <h2 className="enc-nombre">???</h2>
                    <p className="enc-texto">Todavía no tienes esta ave. Captúrala en el recorrido para ver su ficha.</p>
                  </div>
                  <div className="enc-acciones">
                    <button type="button" className="enc-btn enc-btn--amarillo" onClick={() => onIniciar?.()}>Ir al recorrido</button>
                  </div>
                </>
              )}
            </article>
          </section>
        ) : (
          /* ===================== COLECCIÓN ===================== */
          <>
            <header className="enc-barra">
              <button type="button" className="enc-btn-icono" onClick={() => onVolver?.()} aria-label="Volver al inicio">←</button>
              <span className="enc-barra-titulo">{capturadas.length} / {aves.length}</span>
            </header>

            <div className="enc-titulo">
              <h1>Enciclopedia</h1>
              <p>Aves del campus UAO</p>
              <div
                className="enc-progreso"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={aves.length}
                aria-valuenow={capturadas.length}
                aria-label="Aves capturadas"
              >
                <i style={{ width: `${(capturadas.length / aves.length) * 100}%` }} />
              </div>
            </div>

            {superQuiz && <BotonSuperQuiz datos={superQuiz} onClick={onSuperQuiz} />}

            <div className="enc-grid">
              {aves.map((a, i) => {
                const estaCapturada = capturadas.includes(a.id)
                const quiz = quices[a.id]
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`enc-carta ${estaCapturada ? '' : 'enc-carta--bloq'}`}
                    style={{ '--retraso': `${i * 70}ms` }}
                    onClick={() => onSeleccionar(a.id)}
                    aria-label={estaCapturada ? `${a.nombre}, número ${numero(i)}` : `Ave ${numero(i)}, sin capturar`}
                  >
                    <span className="enc-carta-num">#{numero(i)}</span>

                    {/* IMAGEN PEQUEÑA DEL AVE (cuadrada).
                        Viene de aves.js: a.ilustracion.
                        Si el ave no está capturada, aquí va la silueta. */}
                    <span className="enc-carta-img">
                      {estaCapturada && a.ilustracion ? (
                        <img src={a.ilustracion} alt="" loading="lazy" />
                      ) : (
                        <span className="enc-espacio">{estaCapturada ? 'Imagen' : '?'}</span>
                      )}
                    </span>

                    <span className="enc-carta-nombre">{estaCapturada ? a.nombre : '???'}</span>
                    {quiz?.completado && (
                      <span className="enc-carta-quiz">✓ Quiz {quiz.puntaje}/{a.quiz?.length ?? 3}</span>
                    )}
                  </button>
                )
              })}

              <div className="enc-pronto" style={{ '--retraso': `${aves.length * 70}ms` }}>Pronto, más aves</div>
            </div>
          </>
        )}
      </main>
    </>
  )
}

/* Botón del súper quiz.
   - Bloqueado: gris, no se puede tocar, dice cuántos quices faltan.
   - Desbloqueado: rojo, con anillo que late y un brillo que pasa de vez en cuando. */
function BotonSuperQuiz({ datos, onClick }) {
  const { desbloqueado, completado, mejorPuntaje, aprobados, total } = datos
  const faltan = total - aprobados

  let detalle
  if (!desbloqueado) {
    detalle = `Aprueba el quiz de todas las aves (${aprobados}/${total}). Te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}.`
  } else if (completado) {
    detalle = `Superado. Tu mejor puntaje: ${mejorPuntaje}. Toca para jugar otra vez.`
  } else {
    detalle = '¡Ya puedes jugarlo! Preguntas de todas las aves.'
  }

  return (
    <button
      type="button"
      className={`enc-super ${desbloqueado ? 'enc-super--abierto' : 'enc-super--bloq'}`}
      disabled={!desbloqueado}
      onClick={onClick}
    >
      <span className="enc-super-icono" aria-hidden="true">
        {desbloqueado ? (
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V7z" /></svg>
        )}
      </span>
      <span className="enc-super-texto">
        <strong>Súper quiz</strong>
        <small>{detalle}</small>
      </span>
    </button>
  )
}

export default Enciclopedia
