import { useState } from 'react'
import '../Enciclopedia.css' // misma base visual que la enciclopedia
import './Logros.css'
import { LOGROS } from '../data/logros.js'
import { useProgreso } from '../Progreso.js'

/* Pantalla de logros. Lee el progreso guardado y marca cuáles ya se ganaron.
   Los logros se definen en data/logros.js. */
const GRUPOS = [
  { id: 'quices', titulo: 'Quices' },
  { id: 'captura', titulo: 'Captura de aves' },
]

export default function Logros({ onVolver }) {
  const { progreso } = useProgreso()

  const lista = LOGROS.map((l) => ({
    ...l,
    ganado: l.cumple(progreso),
    avance: l.avance ? l.avance(progreso) : null,
  }))
  const ganados = lista.filter((l) => l.ganado).length

  return (
    <main className="enc lg">
      <header className="enc-barra">
        <button type="button" className="enc-btn-icono" onClick={onVolver} aria-label="Volver al inicio">←</button>
        <span className="enc-barra-titulo">{ganados} / {lista.length}</span>
      </header>

      <div className="enc-titulo">
        <h1>Logros</h1>
        <p>Tu recorrido por las aves del campus</p>
        <div
          className="enc-progreso"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={lista.length}
          aria-valuenow={ganados}
          aria-label="Logros conseguidos"
        >
          <i style={{ width: `${(ganados / lista.length) * 100}%` }} />
        </div>
      </div>

      {GRUPOS.map((g) => {
        const items = lista.filter((l) => l.grupo === g.id)
        if (!items.length) return null
        return (
          <section className="lg-grupo" key={g.id} aria-labelledby={`lg-${g.id}`}>
            <h2 id={`lg-${g.id}`}>{g.titulo}</h2>
            <ul className="lg-lista">
              {items.map((l, i) => (
                <li
                  key={l.id}
                  className={`lg-logro ${l.ganado ? 'lg-logro--ganado' : 'lg-logro--bloq'} ${l.super ? 'lg-logro--super' : ''}`}
                  style={{ '--retraso': `${i * 60}ms` }}
                >
                  <Medalla logro={l} />
                  <div className="lg-texto">
                    <strong>{l.nombre}</strong>
                    <span>{l.descripcion}</span>
                    {!l.ganado && l.avance && (
                      <span className="lg-avance">{l.avance[0]} / {l.avance[1]}</span>
                    )}
                  </div>
                  <span className="lg-estado">{l.ganado ? 'Conseguido' : 'Bloqueado'}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}

// Medalla: ilustración del ave (logros de quiz) o un símbolo corto. Bloqueada = candado.
function Medalla({ logro }) {
  const [falla, setFalla] = useState(false)
  const verImagen = logro.ganado && logro.imagen && !falla
  return (
    <span className="lg-medalla" aria-hidden="true">
      {!logro.ganado ? (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V7z" />
        </svg>
      ) : verImagen ? (
        <img src={logro.imagen} alt="" onError={() => setFalla(true)} />
      ) : (
        <span className="lg-simbolo">{logro.simbolo ?? '★'}</span>
      )}
    </span>
  )
}
