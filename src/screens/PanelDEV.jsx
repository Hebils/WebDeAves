import { useEffect, useRef, useState } from 'react'
import './PanelDev.css'
import { AVES } from '../data/aves.js'
import { LOGROS } from '../data/logros.js'
import { cuantosQuicesAprobados, totalQuices, useProgreso } from '../Progreso.js'
import {
  CODIGO_DEV,
  activarSesionDev,
  cerrarSesionDev,
  guardarModoCapturaPrueba,
  modoCapturaPrueba,
  sesionDevActiva,
} from '../Desarrollo.js'

/* Mini panel para el equipo de desarrollo. Se abre con el logo UAO del menú (ver Inicio.jsx).
   Pide el código una vez por pestaña (CODIGO_DEV en Desarrollo.js) y luego muestra las opciones.
   Lo que cambia aquí se guarda en el mismo progreso que usan la enciclopedia y los logros. */
export default function PanelDev({ onCerrar }) {
  const [autorizado, setAutorizado] = useState(sesionDevActiva)
  const tarjeta = useRef(null)
  // Se recuerda quién tenía el foco (el logo) ANTES de que el panel lo tome, para devolvérselo al cerrar
  const [quienAbrio] = useState(() => document.activeElement)
  useEffect(() => () => quienAbrio?.focus?.(), [quienAbrio])

  // Escape cierra; Tab no se escapa del panel
  useEffect(() => {
    function alTeclear(e) {
      if (e.key === 'Escape') {
        onCerrar()
        return
      }
      if (e.key !== 'Tab' || !tarjeta.current) return
      const items = [...tarjeta.current.querySelectorAll('button, input')].filter((el) => !el.disabled)
      if (!items.length) return
      const primero = items[0]
      const ultimo = items[items.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div className="pd-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <section className="pd" ref={tarjeta} role="dialog" aria-modal="true" aria-labelledby="pd-titulo">
        <header className="pd-cab">
          <h2 id="pd-titulo">Modo desarrollador</h2>
          <button type="button" className="pd-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        {autorizado ? (
          <Opciones
            onSalir={() => {
              cerrarSesionDev()
              onCerrar()
            }}
          />
        ) : (
          <Acceso
            onCorrecto={() => {
              activarSesionDev()
              setAutorizado(true)
            }}
          />
        )}
      </section>
    </div>
  )
}

/* ---------- Paso 1: pedir el código ---------- */
function Acceso({ onCorrecto }) {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState(false)
  const campo = useRef(null)

  useEffect(() => {
    campo.current?.focus()
  }, [])

  function enviar(e) {
    e.preventDefault()
    if (codigo === CODIGO_DEV) {
      onCorrecto()
    } else {
      setError(true)
      setCodigo('')
      campo.current?.focus()
    }
  }

  return (
    <form className="pd-acceso" onSubmit={enviar}>
      <label htmlFor="pd-codigo">Escribe el código del equipo</label>
      <input
        id="pd-codigo"
        ref={campo}
        className={`pd-codigo ${error ? 'pd-codigo--error' : ''}`}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={codigo}
        onChange={(e) => {
          setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))
          setError(false)
        }}
        aria-invalid={error}
        aria-describedby="pd-error"
      />
      <p id="pd-error" className="pd-error" role="alert">{error ? 'Código incorrecto. Prueba de nuevo.' : ''}</p>
      <button type="submit" className="pd-btn pd-btn--oro" disabled={codigo.length < 4}>Entrar</button>
    </form>
  )
}

/* ---------- Paso 2: opciones ---------- */
function Opciones({ onSalir }) {
  const { progreso, reiniciar, dev } = useProgreso()
  const [capturaPrueba, setCapturaPrueba] = useState(modoCapturaPrueba)
  const [aviso, setAviso] = useState('')
  const [confirmarReinicio, setConfirmarReinicio] = useState(false)

  const ganados = LOGROS.filter((l) => l.cumple(progreso)).length

  function hacer(accion, mensaje) {
    accion()
    setAviso(mensaje)
    setConfirmarReinicio(false)
  }

  function alternarCapturaPrueba() {
    const nuevo = !capturaPrueba
    guardarModoCapturaPrueba(nuevo)
    setCapturaPrueba(nuevo)
    setAviso(nuevo ? 'Modo captura de prueba activado.' : 'Modo captura de prueba desactivado.')
  }

  return (
    <div className="pd-opciones">
      <dl className="pd-estado" aria-label="Estado actual">
        <div><dt>Aves</dt><dd>{progreso.capturadas.length}/{AVES.length}</dd></div>
        <div><dt>Quices</dt><dd>{cuantosQuicesAprobados(progreso)}/{totalQuices()}</dd></div>
        <div><dt>Logros</dt><dd>{ganados}/{LOGROS.length}</dd></div>
      </dl>

      <p className="pd-aviso" role="status">{aviso}</p>

      <div className="pd-grupo">
        <button type="button" className="pd-btn" onClick={() => hacer(dev.desbloquearAves, 'Todas las aves desbloqueadas en la enciclopedia.')}>
          Desbloquear todas las aves
        </button>
        <button type="button" className="pd-btn" onClick={() => hacer(dev.aprobarQuices, 'Quices aprobados: el súper quiz ya se puede jugar.')}>
          Aprobar todos los quices
        </button>
        <button type="button" className="pd-btn" onClick={() => hacer(dev.desbloquearLogros, 'Todos los logros desbloqueados, incluido el súper quiz.')}>
          Desbloquear todos los logros
        </button>
      </div>

      <h3>Captura de prueba</h3>
      <button
        type="button"
        role="switch"
        aria-checked={capturaPrueba}
        className={`pd-fila pd-fila--modo ${capturaPrueba ? 'pd-fila--on' : ''}`}
        onClick={alternarCapturaPrueba}
      >
        <span>
          <strong>Modo captura de prueba</strong>
          <small>Se guarda para que el aviario capture sin ir al lugar del ave.</small>
        </span>
        <span className="pd-interruptor" aria-hidden="true" />
      </button>

      <ul className="pd-aves" aria-label="Capturar aves una por una">
        {AVES.map((a) => {
          const capturada = progreso.capturadas.includes(a.id)
          return (
            <li key={a.id}>
              <button
                type="button"
                role="switch"
                aria-checked={capturada}
                className={`pd-fila ${capturada ? 'pd-fila--on' : ''}`}
                onClick={() => hacer(() => dev.alternarCaptura(a.id), capturada ? `${a.nombre} liberada.` : `${a.nombre} capturada.`)}
              >
                <span><strong>{a.nombre}</strong><small>{capturada ? 'Capturada' : 'Sin capturar'}</small></span>
                <span className="pd-interruptor" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="pd-grupo pd-grupo--pie">
        {confirmarReinicio ? (
          <>
            <p className="pd-aviso pd-aviso--alerta">Se borrarán aves, quices y logros de este navegador.</p>
            <button type="button" className="pd-btn pd-btn--peligro" onClick={() => hacer(reiniciar, 'Progreso reiniciado: todo vuelve a empezar bloqueado.')}>
              Sí, reiniciar todo
            </button>
            <button type="button" className="pd-btn" onClick={() => setConfirmarReinicio(false)}>Cancelar</button>
          </>
        ) : (
          <button type="button" className="pd-btn pd-btn--peligro" onClick={() => setConfirmarReinicio(true)}>
            Reiniciar progreso
          </button>
        )}
        <button type="button" className="pd-btn pd-btn--texto" onClick={onSalir}>Salir del modo desarrollador</button>
      </div>
    </div>
  )
}
