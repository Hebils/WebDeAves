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
  const trofeo = lista.find((l) => l.super)

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

      {trofeo && <Trofeo logro={trofeo} />}

      {GRUPOS.map((g) => {
        const items = lista.filter((l) => l.grupo === g.id && !l.super)
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
// Trofeo platino: el logro más difícil, aparte del resto y a lo grande.
// Bloqueado muestra cuántos pasos lleva (un quiz por ave + el súper quiz).
function Trofeo({ logro }) {
  const [hecho, total] = logro.avance ?? [0, 1]
  return (
    <section className={`lg-trofeo ${logro.ganado ? 'lg-trofeo--ganado' : 'lg-trofeo--bloq'}`} aria-labelledby="lg-trofeo-nombre">
      <div className="lg-trofeo-copa" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <defs>
            <linearGradient id="lg-platino" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".45" stopColor="#cfd9e6" />
              <stop offset=".6" stopColor="#f1f5fa" />
              <stop offset="1" stopColor="#8fa0b6" />
            </linearGradient>
          </defs>
          <g fill={logro.ganado ? 'url(#lg-platino)' : '#6f0011'} stroke={logro.ganado ? '#7d8da3' : '#8d1a2b'} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M30 14h60v30c0 22-14 36-30 40-16-4-30-18-30-40z" />
            <path d="M30 24H15c-2 22 8 32 23 34" fill="none" strokeWidth="7" strokeLinecap="round" />
            <path d="M90 24h15c2 22-8 32-23 34" fill="none" strokeWidth="7" strokeLinecap="round" />
            <rect x="54" y="84" width="12" height="18" />
            <rect x="36" y="100" width="48" height="11" rx="3" />
          </g>
          {logro.ganado ? (
            <path d="M60 28l5.2 10.8 11.8 1.6-8.6 8.3 2.1 11.8L60 54.9 49.5 60.5l2.1-11.8-8.6-8.3 11.8-1.6z" fill="#b8860b" />
          ) : (
            <path transform="translate(44 26) scale(1.35)" fill="#ffb3bd" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V7z" />
          )}
        </svg>
      </div>

      <p className="lg-trofeo-tipo">Trofeo platino</p>
      <h2 id="lg-trofeo-nombre">{logro.nombre}</h2>
      <p className="lg-trofeo-desc">{logro.descripcion}</p>

      {logro.ganado ? (
        <p className="lg-trofeo-estado">Conseguido</p>
      ) : (
        <>
          <div className="lg-trofeo-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hecho} aria-label="Pasos para el trofeo platino">
            <i style={{ width: `${(hecho / total) * 100}%` }} />
          </div>
          <p className="lg-trofeo-pasos">{hecho} de {total} pasos</p>
        </>
      )}
    </section>
  )
}
