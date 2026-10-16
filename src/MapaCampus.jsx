import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AVES } from './data/aves.js'
import { PUNTOS, RADIO_PUNTO } from './data/puntos.js'
import { distanciaM, puntoMasCercano, textoDistancia } from './ubicacion.js'
import './MapaCampus.css'

// Icono de cada punto: círculo con número (✓ si ya capturaste su ave) y la distancia debajo
function iconoPunto(numero, estado, distancia, seleccionado) {
  const texto = estado === 'hecho' ? '✓' : estado === 'vacio' ? '–' : numero
  return L.divIcon({
    className: 'mp-icono',
    html:
      `<div class="mp-pin mp-pin--${estado}${seleccionado ? ' mp-pin--sel' : ''}">${texto}</div>` +
      (distancia ? `<div class="mp-dist">${distancia}</div>` : ''),
    iconSize: [60, 70],
    iconAnchor: [30, 47],
  })
}

// Mapa real del campus con los 5 puntos de interés y la ubicación del usuario.
export default function MapaCampus({ asignacion, capturadas = [], ubic, onCerrar }) {
  const contRef = useRef(null)
  const mapaRef = useRef(null)
  const marcadoresRef = useRef({})
  const usuarioRef = useRef({})
  const [seleccionado, setSeleccionado] = useState(null)
  const { posicion, error, demo, setDemo, irAPunto } = ubic

  // 'activo' = hay un ave esperando · 'hecho' = ya capturada · 'vacio' = este punto no tiene ave
  const estadoDe = (p) => {
    const aveId = asignacion[p.id]
    if (!aveId) return 'vacio'
    return capturadas.includes(aveId) ? 'hecho' : 'activo'
  }

  // ---------- Crear el mapa (una sola vez) ----------
  useEffect(() => {
    const mapa = L.map(contRef.current, { zoomControl: false, maxZoom: 20 })
    const calles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    })
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, maxNativeZoom: 19, attribution: 'Imágenes © Esri' },
    )
    calles.addTo(mapa)
    L.control.layers({ Calles: calles, Satélite: satelite }, null, { position: 'topright' }).addTo(mapa)
    mapa.fitBounds(L.latLngBounds(PUNTOS.map((p) => [p.lat, p.lng])), { padding: [60, 60] })

    PUNTOS.forEach((p, i) => {
      // Zona de llegada
      L.circle([p.lat, p.lng], {
        radius: RADIO_PUNTO, color: '#880015', weight: 2, fillColor: '#880015', fillOpacity: 0.12,
      }).addTo(mapa)
      const marcador = L.marker([p.lat, p.lng], { icon: iconoPunto(i + 1, 'activo', '', false), keyboard: false }).addTo(mapa)
      marcador.on('click', () => setSeleccionado(p.id))
      marcadoresRef.current[p.id] = marcador
    })
    mapa.on('click', () => setSeleccionado(null))

    mapaRef.current = mapa
    setTimeout(() => mapa.invalidateSize(), 0)
    return () => {
      mapa.remove()
      mapaRef.current = null
      marcadoresRef.current = {}
      usuarioRef.current = {}
    }
  }, [])

  // ---------- Iconos: estado de cada punto y distancia al usuario ----------
  useEffect(() => {
    PUNTOS.forEach((p, i) => {
      const marcador = marcadoresRef.current[p.id]
      if (!marcador) return
      const distancia = posicion ? textoDistancia(distanciaM(posicion, p)) : ''
      marcador.setIcon(iconoPunto(i + 1, estadoDe(p), distancia, seleccionado === p.id))
    })
  }, [asignacion, capturadas, posicion, seleccionado])

  // ---------- Punto azul: dónde está el usuario ----------
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    const u = usuarioRef.current
    if (!posicion) {
      u.punto?.remove()
      u.precision?.remove()
      usuarioRef.current = {}
      return
    }
    const ll = [posicion.lat, posicion.lng]
    if (!u.punto) {
      u.precision = L.circle(ll, { radius: posicion.precision ?? 10, color: '#1a73e8', weight: 1, fillOpacity: 0.12 }).addTo(mapa)
      u.punto = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }).addTo(mapa)
    } else {
      u.punto.setLatLng(ll)
      u.precision.setLatLng(ll)
      u.precision.setRadius(posicion.precision ?? 10)
    }
  }, [posicion])

  function verTodos() {
    mapaRef.current?.fitBounds(L.latLngBounds(PUNTOS.map((p) => [p.lat, p.lng])), { padding: [60, 60] })
  }
  function centrarEnMi() {
    if (posicion) mapaRef.current?.flyTo([posicion.lat, posicion.lng], 19)
  }

  // ---------- Textos ----------
  const asignados = PUNTOS.filter((p) => asignacion[p.id])
  const hechos = asignados.filter((p) => estadoDe(p) === 'hecho').length
  const cercano = puntoMasCercano(posicion)
  const punto = PUNTOS.find((p) => p.id === seleccionado)
  const ave = punto && asignacion[punto.id] ? AVES.find((a) => a.id === asignacion[punto.id]) : null
  const distSel = punto && posicion ? distanciaM(posicion, punto) : null

  let textoPunto = ''
  if (punto) {
    const estado = estadoDe(punto)
    textoPunto =
      estado === 'hecho' ? `Aquí capturaste al ${ave.nombre}.`
      : estado === 'activo' ? 'Hay un ave esperándote aquí. ¡Acércate para que aparezca!'
      : 'Este punto no tiene ave por ahora.'
  }

  let resumen = 'Buscando tu ubicación…'
  if (error === 'negado') resumen = 'Activa la ubicación del celular para ver qué tan cerca estás'
  else if (cercano) {
    resumen = cercano.distancia <= RADIO_PUNTO
      ? `¡Estás en ${cercano.punto.nombre}!`
      : `Punto más cercano: ${cercano.punto.nombre} · a ${textoDistancia(cercano.distancia)}`
  }

  return (
    <div className="mapa">
      <header className="mapa-cab">
        <div>
          <h2>Mapa del campus</h2>
          <p>{hechos} de {asignados.length} aves encontradas</p>
        </div>
        <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar mapa">✕</button>
      </header>

      <div className="mapa-visor">
        <div ref={contRef} className="mapa-mapa"></div>
        <div className="mapa-flotantes">
          <button type="button" className="mapa-mini" onClick={centrarEnMi} disabled={!posicion}>Mi ubicación</button>
          <button type="button" className="mapa-mini" onClick={verTodos}>Ver todos</button>
        </div>
      </div>

      <div className="mapa-info">
        {punto ? (
          <>
            <h3>{punto.nombre}</h3>
            <p>{textoPunto}</p>
            <p className="mapa-dist">
              {distSel === null ? 'Buscando tu ubicación…'
                : distSel <= RADIO_PUNTO ? '¡Ya estás aquí!'
                : `Estás a ${textoDistancia(distSel)}`}
            </p>
            {demo && (
              <button
                type="button"
                className="mapa-btn"
                onClick={() => { irAPunto(punto.id); mapaRef.current?.flyTo([punto.lat, punto.lng], 19) }}
              >
                Ir a este punto (demo)
              </button>
            )}
          </>
        ) : (
          <p className="mapa-resumen">{resumen}{demo ? ' (demo)' : ''}</p>
        )}
        <button type="button" className={`mapa-demo${demo ? ' mapa-demo--on' : ''}`} onClick={() => setDemo(!demo)}>
          Modo demo: {demo ? 'activado' : 'desactivado'}
        </button>
      </div>
    </div>
  )
}