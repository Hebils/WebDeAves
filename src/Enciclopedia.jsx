import { useState, useEffect, useRef } from 'react'
import './Enciclopedia.css'

/* Esta pantalla solo muestra cosas.
   Los datos y el progreso llegan desde ConexionEnciclopedia.jsx */
function Enciclopedia({
  aves, capturadas, quices, seleccionada,
  onSeleccionar, onCerrar, onNavegar, onVolver, onIniciar, onQuiz,
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
                    <button type="button" className="enc-btn enc-btn--amarillo" onClick={() => onQuiz?.(ave.id)}>
                      {quizDelAve?.completado
                        ? `Repetir quiz (${quizDelAve.puntaje}/${ave.quiz?.length ?? 3})`
                        : 'Hacer el quiz'}
                    </button>
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
                      <span className="enc-carta-quiz">Quiz {quiz.puntaje}/{a.quiz?.length ?? 3}</span>
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

export default Enciclopedia