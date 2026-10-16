// Ubicación del usuario (GPS), distancias a los puntos de interés y modo demo.
import { useCallback, useEffect, useState } from 'react'
import { PUNTOS } from './data/puntos.js'

// Distancia en metros entre dos coordenadas { lat, lng }
export function distanciaM(a, b) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function textoDistancia(metros) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`
}

// Punto de interés más cercano a la posición: { punto, distancia } (o null si no hay posición)
export function puntoMasCercano(posicion) {
  if (!posicion) return null
  let mejor = null
  PUNTOS.forEach((p) => {
    const d = distanciaM(posicion, p)
    if (!mejor || d < mejor.distancia) mejor = { punto: p, distancia: d }
  })
  return mejor
}

// Hook: sigue al usuario con el GPS mientras "activo" sea true.
// Devuelve { posicion, error, demo, setDemo, irAPunto }
//  - posicion: { lat, lng, precision } o null
//  - error: null | 'negado' | 'sin-senal' | 'sin-gps'
//  - demo: con el modo demo se puede "teletransportar" a un punto (para probar sin estar en el campus)
export function useUbicacion(activo) {
  const [real, setReal] = useState(null)
  const [error, setError] = useState(null)
  const [demo, setDemoEstado] = useState(false)
  const [simulada, setSimulada] = useState(null)

  useEffect(() => {
    if (!activo) return
    if (!('geolocation' in navigator)) {
      setError('sin-gps')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null)
        setReal({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy })
      },
      (e) => setError(e.code === 1 ? 'negado' : 'sin-senal'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [activo])

  const setDemo = useCallback((valor) => {
    setDemoEstado(valor)
    if (!valor) setSimulada(null)
  }, [])

  // Modo demo: se coloca al usuario justo en un punto
  const irAPunto = useCallback((id) => {
    const p = PUNTOS.find((x) => x.id === id)
    if (!p) return
    setDemoEstado(true)
    setSimulada({ lat: p.lat, lng: p.lng, precision: 5 })
  }, [])

  const posicion = demo && simulada ? simulada : real
  return { posicion, error, demo, setDemo, irAPunto }
}