import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Enciclopedia from './Enciclopedia.jsx'
import { AVES } from './data/aves.js'
import { useProgreso } from './Progreso.js'

/* Junta los datos con la pantalla:
   - las aves (aves.js)
   - lo que el usuario ya capturó (progreso.js)
   Y le pasa todo a Enciclopedia.
   Esta es la página Enciclopedia.html, igual que el aviario. */
function ConexionEnciclopedia() {
  const { progreso } = useProgreso()
  const [seleccionId, setSeleccionId] = useState(null) // ave abierta (null = ninguna)

  const seleccionada = AVES.find((a) => a.id === seleccionId) ?? null

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

  return (
    <Enciclopedia
      aves={AVES}
      capturadas={progreso.capturadas ?? []}
      quices={progreso.quices ?? {}}
      seleccionada={seleccionada}
      onSeleccionar={setSeleccionId}
      onCerrar={() => setSeleccionId(null)}
      onNavegar={navegar}
      onVolver={volverAlInicio}
      onIniciar={volverAlInicio}
    />
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConexionEnciclopedia />
  </StrictMode>,
)