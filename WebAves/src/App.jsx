import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import AFRAME from 'aframe';
import './App.css'

function App() {


  return (
    <>
      <div className="landing-container">
        <h1 className="landing-title">Bienvenido a WebAves</h1>
        <p className="landing-description">
          Explora el mundo de las aves en 3D. Haz clic en el botón para comenzar tu viaje.
        </p>
        <a href="/aviario" className="landing-button">Comenzar</a>
      </div>
    </>
  )
}

export default App
