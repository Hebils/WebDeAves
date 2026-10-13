import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import AFRAME from 'aframe';
import './aviario.css'
import { AVES } from './data/aves.js'

function Aviario() {
  // const Aves = [
  //   { id: 1, name: 'Paloma' },
  //   { id: 2, name: 'Gaviota' },
  //   { id: 3, name: 'Pato' },
  //   { id: 4, name: 'Águila' },
  //   { id: 5, name: 'Buho', titulo: 'Currucutú' }
  // ].map((ave) => ({
  //   ...ave,
  //   modelName: `/Modelos/${ave.name.toLowerCase()}.glb`
  // }))

  return (
    <>
      <a-scene>
        <a-light type="ambient" color="#dde9e7"></a-light>
        <a-light type="point" intensity="2" position="2 4 4"></a-light>

        AVES.map((ave) => (
        <a-entity key={ave.id} position={`${ave.lat} ${ave.lng} 0`}>
          <a-gltf-model src={ave.modelo} scale="0.5 0.5 0.5" rotation="0 180 0"></a-gltf-model>
          <a-text value={ave.nombre} position="0 1 0" align="center" color="#000"></a-text>
        </a-entity>
        ))

        <a-sky color="#7cd2e7"></a-sky>
      </a-scene>
    </>
  )
}

export default Aviario
