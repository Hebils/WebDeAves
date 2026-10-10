import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import AFRAME from 'aframe';
import './aviario.css'

function Aviario() {
  const Aves = [
    { id: 1, name: 'Paloma' },
    { id: 2, name: 'Gaviota' },
    { id: 3, name: 'Pato' },
    { id: 4, name: 'Águila' },
    { id: 5, name: 'Buho', titulo: 'Currucutú' }
  ].map((ave) => ({
    ...ave,
    modelName: `Models/${ave.name.toLowerCase()}.glb`
  }))

  return (
    <>
      <a-scene>
        <a-light type="ambient" color="#dde9e7"></a-light>
        <a-light type="point" intensity="2" position="2 4 4"></a-light>

        {Aves.map((ave) => (
          <a-entity
            key={ave.id}
            gltf-model={ave.modelName}
            animation-mixer : clip="idle"
            position={`${Math.random() * 4 - 2} ${Math.random() * 2 + 1} ${Math.random() * -4}`}
          >
            <a-text value={ave.name} align="center" position="0 0.75 0" color="#000000"></a-text>
          </a-entity>
        ))}

        <a-sky color="#7cd2e7"></a-sky>
      </a-scene>
    </>
  )
}

export default Aviario
