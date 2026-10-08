import { useState } from 'react'
import Inicio from './screens/Inicio.jsx'
import Pendiente from './screens/Pendiente.jsx'
import Aviario from './aviarioHtml.jsx'
import Enciclopedia from './Enciclopedia.jsx'
import './App.css'

// Navegación por estado (sin react-router) -> cero problemas en GitHub Pages.
export default function App() {
  const [pantalla, setPantalla] = useState('inicio')
  const volver = () => setPantalla('inicio')

  switch (pantalla) {
    case 'juego':
      return window.open("/aviario.html", "_self")
    case 'coleccion':
      return window.open("/Enciclopedia.html", "_self") //ni idea si funcione la verdad
    case 'logros':
      return <Pendiente titulo="Logros" onVolver={volver} />
    default:
      return <Inicio onNavegar={setPantalla} />
  }
}