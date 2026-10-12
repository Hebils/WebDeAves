import { useState } from 'react'
import Inicio from './screens/Inicio.jsx'
import Logros from './screens/Logros.jsx'
import PanelDev from './screens/PanelDEV.jsx'
import './App.css'

// Navegación por estado (sin react-router) -> cero problemas en GitHub Pages.
export default function App() {
  const [pantalla, setPantalla] = useState('inicio')
  const [devAbierto, setDevAbierto] = useState(false) // panel secreto (logo UAO del menú)
  const volver = () => setPantalla('inicio')

  // 'juego' y 'coleccion' son páginas aparte (aviario.html y Enciclopedia.html):
  // se abren al tocar el botón, no al dibujar la pantalla.
  const navegar = (destino) => {
    if (destino === 'juego') window.location.assign('./aviario.html')
    else if (destino === 'coleccion') window.location.assign('./Enciclopedia.html')
    else setPantalla(destino)
  }

  return (
    <>
      {pantalla === 'logros' ? (
        <Logros onVolver={volver} />
      ) : (
        <Inicio onNavegar={navegar} onAbrirDev={() => setDevAbierto(true)} />
      )}
      {devAbierto && <PanelDev onCerrar={() => setDevAbierto(false)} />}
    </>
  )
}
