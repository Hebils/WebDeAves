// Puntos de interés REALES del campus (coordenadas GPS) y reparto al azar de las aves.
import { AVES } from './aves.js'

// A cuántos metros de un punto se considera que el usuario "llegó" a él
export const RADIO_PUNTO = 15

// true  = las aves solo aparecen en la cámara cuando el usuario está cerca de su punto
// false = las aves aparecen solas, como antes (útil para probar en casa)
export const EXIGIR_CERCANIA = true

export const PUNTOS = [
  { id: 'p1', nombre: 'Punto 1', lat: 3.354005, lng: -76.521772 },
  { id: 'p2', nombre: 'Punto 2', lat: 3.353742, lng: -76.521866 },
  { id: 'p3', nombre: 'Punto 3', lat: 3.353503, lng: -76.520995 },
  { id: 'p4', nombre: 'Punto 4', lat: 3.353337, lng: -76.520939 },
  { id: 'p5', nombre: 'Punto 5', lat: 3.352712, lng: -76.519772 },
]

function mezclar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// Reparte al azar las aves que faltan por capturar en los puntos (nada queda fijo).
// Si ya capturó todas, se reparten todas otra vez. Devuelve { p1: 'torcaza', p3: 'gavilan', ... }
// Los puntos que no reciben ave quedan fuera del objeto.
export function asignarAves(capturadas = []) {
  const pendientes = AVES.filter((a) => !capturadas.includes(a.id))
  const lista = pendientes.length > 0 ? pendientes : AVES
  const puntos = mezclar(PUNTOS).slice(0, lista.length)
  const aves = mezclar(lista)
  return Object.fromEntries(puntos.map((p, i) => [p.id, aves[i].id]))
}