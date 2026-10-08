import { useState } from 'react'
import Inicio from './screens/Inicio.jsx'
import Pendiente from './screens/Pendiente.jsx'
import './App.css'

// Navegación por estado (sin react-router) -> cero problemas en GitHub Pages.
export default function App() {
  const [pantalla, setPantalla] = useState('inicio')
  const volver = () => setPantalla('inicio')

  switch (pantalla) {
    case 'juego':
      return <Pendiente titulo="Recorrido AR" onVolver={volver} />
    case 'coleccion':
      return <Pendiente titulo="Colección" onVolver={volver} />
    case 'logros':
      return <Pendiente titulo="Logros" onVolver={volver} />
    default:
      return <Inicio onNavegar={setPantalla} />
  }
}