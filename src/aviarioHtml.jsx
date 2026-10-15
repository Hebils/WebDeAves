import { useEffect, useMemo, useRef, useState } from 'react'
import { AVES } from './data/aves.js'
import { useProgreso } from './Progreso.js'
import './aviario.css'

/* ======================================================================
   EXPERIENCIA DE RA CON GPS: el usuario es un fotógrafo de aves.
   - Cada ave está en unas coordenadas reales del campus (lat y lng de aves.js).
   - Al caminar hacia ella se ve más grande, como en la vida real.
   - Se busca el ave, se mantiene centrada para enfocarla y se toca el botón de foto.
   - Al tomar la foto sale la tarjeta del ave, con el quiz opcional.

   IMPORTANTE: A-Frame y AR.js se cargan con <script> en aviario.html (no con import),
   por eso aquí se usa window.AFRAME.
   ====================================================================== */

const AFRAME = window.AFRAME

// ---------- Ajustes (se pueden cambiar fácil) ----------
const MODO_DEMO = true          // true = las aves sin coordenadas aparecen a 8–16 m de ti (para probar)
const ESCALA_AVE = 3            // tamaño de los modelos 3D (sube o baja según se vean)
const ALTURA_AVE = 1            // altura del ave sobre el suelo, en metros
const RADIO_POR_DEFECTO = 25    // a cuántos metros aparece un ave si no tiene "radio" en aves.js
const GRADOS_ENFOQUE = 10       // qué tan centrada debe estar el ave para enfocarla
const SEGUNDOS_ENFOQUE = 2      // cuánto tiempo hay que mantenerla centrada
const GRADOS_MAXIMOS_FOTO = 25  // si el ave está más lejos del centro, no sale en la foto

const BASE = import.meta.env.BASE_URL

/* ---------- Componente de A-Frame: reproduce la animación del modelo .glb ----------
   Se usa en cada ave con el atributo animar-glb.
   Busca una animación llamada "idle"; si no existe, usa la primera que tenga. */
if (!AFRAME.components['animar-glb']) {
  AFRAME.registerComponent('animar-glb', {
    init() {
      this.mixer = null
      this.el.addEventListener('model-loaded', (e) => {
        const modelo = e.detail.model
        const clips = modelo.animations || []
        if (clips.length === 0) return
        const clip = clips.find((c) => /idle/i.test(c.name)) || clips[0]
        this.mixer = new AFRAME.THREE.AnimationMixer(modelo)
        this.mixer.clipAction(clip).play()
      })
    },
    tick(tiempo, delta) {
      if (this.mixer) this.mixer.update(delta / 1000)
    },
  })
}

/* ---------- Funciones pequeñas ---------- */

// Distancia en metros entre dos puntos GPS
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Modo demo: un punto a 8–16 metros del usuario, en una dirección distinta para cada ave.
// (1 grado de latitud ≈ 111.320 metros)
function puntoCercano(origen, i, total) {
  const angulo = (i / total) * Math.PI * 2 + Math.random() * 0.8
  const metros = 8 + Math.random() * 8
  return {
    lat: origen.lat + (metros * Math.cos(angulo)) / 111320,
    lng: origen.lng + (metros * Math.sin(angulo)) / (111320 * Math.cos((origen.lat * Math.PI) / 180)),
  }
}

function Aviario() {
  // ---------- Estados ----------
  const { progreso, capturar, completarQuiz } = useProgreso()
  const [activo, setActivo] = useState(false)      // false = pantalla "Activar cámara"
  const [aviso, setAviso] = useState('')           // mensaje corto
  const [listo, setListo] = useState(false)        // true cuando el ave está bien enfocada
  const [flash, setFlash] = useState(false)        // destello blanco al tomar la foto
  const [escondidas, setEscondidas] = useState([]) // aves ya fotografiadas (desaparecen)
  const [gps, setGps] = useState(null)             // ubicación actual { lat, lng }
  const [origen, setOrigen] = useState(null)       // primera ubicación (solo para el modo demo)

  // Tarjeta del ave capturada y su quiz
  const [tarjeta, setTarjeta] = useState(null)     // ave capturada (null = sin tarjeta)
  const [paso, setPaso] = useState('info')         // 'info' | 'quiz' | 'fin'
  const [numPregunta, setNumPregunta] = useState(0)
  const [puntos, setPuntos] = useState(0)
  const [elegida, setElegida] = useState(null)     // opción que tocó el usuario

  // ---------- Referencias ----------
  const escenaRef = useRef(null)   // <a-scene>
  const avesRef = useRef({})       // elementos 3D de las aves, por id
  const anilloRef = useRef(null)   // anillo de enfoque
  const flechaRef = useRef(null)   // texto "gira a la izquierda/derecha"
  const estadoRef = useRef({ grados: 180, id: null }) // lo que se ve en vivo
  const visiblesRef = useRef([])

  // ---------- Aves de esta sesión ----------
  // Se eligen una sola vez: las que el usuario aún no ha capturado.
  // Si ya las capturó todas, entran todas de nuevo.
  const aves = useMemo(() => {
    const capturadas = progreso.capturadas ?? []
    const faltantes = AVES.filter((a) => !capturadas.includes(a.id))
    return faltantes.length > 0 ? faltantes : AVES
  }, [])

  // ---------- Dónde está cada ave ----------
  // Usa lat y lng de aves.js. Si no las tiene y el modo demo está activo,
  // se pone cerca del usuario para poder probar.
  const lugares = useMemo(() => {
    const mapa = {}
    aves.forEach((a, i) => {
      if (a.lat != null && a.lng != null) mapa[a.id] = { lat: a.lat, lng: a.lng }
      else if (MODO_DEMO && origen) mapa[a.id] = puntoCercano(origen, i, aves.length)
    })
    return mapa
  }, [aves, origen])

  // ---------- Aves que se ven ahora ----------
  // Solo las que no se han fotografiado y están dentro de su radio de aparición.
  const pendientes = aves.filter((a) => !escondidas.includes(a.id))
  const visibles = pendientes.filter((a) => {
    const lugar = lugares[a.id]
    if (!gps || !lugar) return false
    return distanciaMetros(gps.lat, gps.lng, lugar.lat, lugar.lng) <= (a.radio ?? RADIO_POR_DEFECTO)
  })
  visiblesRef.current = visibles

  function mostrarAviso(texto) {
    setAviso(texto)
    setTimeout(() => setAviso(''), 2800)
  }

  // ---------- Botón "Activar cámara": pide los permisos (dentro del mismo toque) ----------
  async function activar() {
    // 1) Desbloquear el audio (los navegadores solo lo permiten después de un toque)
    try { AFRAME.THREE.AudioContext.getContext().resume() } catch { /* sigue */ }

    // 2) Giroscopio en iPhone: pide permiso. En Android no hace falta.
    const D = window.DeviceOrientationEvent
    if (D && typeof D.requestPermission === 'function') {
      try {
        const respuesta = await D.requestPermission()
        if (respuesta !== 'granted') mostrarAviso('Sin giroscopio no podrás girar el celular para buscar aves.')
      } catch { mostrarAviso('No se pudo activar el giroscopio.') }
    }

    // 3) Ubicación: se sigue en vivo para saber qué aves están cerca
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (p) => {
          const punto = { lat: p.coords.latitude, lng: p.coords.longitude }
          setGps(punto)
          setOrigen((o) => o ?? punto) // la primera ubicación se guarda para el modo demo
        },
        () => mostrarAviso('No se pudo leer tu ubicación. Activa el GPS.'),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
      )
    }

    // 4) Se crea la escena. AR.js abre la cámara por su cuenta al crearla.
    setActivo(true)
  }

  // Si la cámara falla, AR.js avisa con este evento
  useEffect(() => {
    const alFallarCamara = () => mostrarAviso('No se pudo abrir la cámara. Revisa el permiso.')
    window.addEventListener('camera-error', alFallarCamara)
    return () => window.removeEventListener('camera-error', alFallarCamara)
  }, [])

  // ---------- Mientras se busca: revisa en cada cuadro dónde están las aves ----------
  useEffect(() => {
    if (!activo || tarjeta) return
    const THREE = AFRAME.THREE
    const dirCamara = new THREE.Vector3()
    const posCamara = new THREE.Vector3()
    const posAve = new THREE.Vector3()
    const haciaAve = new THREE.Vector3()
    const local = new THREE.Vector3()
    let progresoEnfoque = 0
    let objetivo = null
    let ultimo = performance.now()
    let estabaListo = false
    let idCuadro

    function revisar() {
      idCuadro = requestAnimationFrame(revisar)
      const escena = escenaRef.current
      if (!escena || !escena.camera) return

      const ahora = performance.now()
      const dt = (ahora - ultimo) / 1000
      ultimo = ahora

      escena.camera.getWorldDirection(dirCamara) // hacia dónde mira el celular
      escena.camera.getWorldPosition(posCamara)

      // Se busca el ave que está más cerca del centro de la pantalla
      let mejorGrados = 180
      let mejorId = null
      let mejorX = 0
      visiblesRef.current.forEach((a) => {
        const el = avesRef.current[a.id]
        if (!el || !el.object3D) return
        el.object3D.getWorldPosition(posAve)
        haciaAve.copy(posAve).sub(posCamara).normalize()
        const grados = THREE.MathUtils.radToDeg(dirCamara.angleTo(haciaAve))

        // El canto de cada ave se oye más fuerte cuanto más cerca del centro está
        const sonido = el.components && el.components.sound
        if (sonido && sonido.pool) {
          const volumen = Math.max(0, 1 - grados / 45)
          sonido.pool.children.forEach((s) => s.setVolume && s.setVolume(volumen))
        }

        if (grados < mejorGrados) {
          mejorGrados = grados
          mejorId = a.id
          local.copy(posAve)
          escena.camera.worldToLocal(local)
          mejorX = local.x
        }
      })

      // Flecha que indica hacia dónde girar para llegar al ave más cercana
      if (flechaRef.current) {
        flechaRef.current.textContent =
          mejorId && mejorGrados > GRADOS_ENFOQUE * 1.5
            ? (mejorX < 0 ? '‹ Gira a la izquierda' : 'Gira a la derecha ›')
            : ''
      }

      // Barra de enfoque: sube si hay un ave centrada, baja si no
      if (mejorId !== objetivo) { objetivo = mejorId; progresoEnfoque = 0 }
      if (mejorId && mejorGrados < GRADOS_ENFOQUE) progresoEnfoque = Math.min(1, progresoEnfoque + dt / SEGUNDOS_ENFOQUE)
      else progresoEnfoque = Math.max(0, progresoEnfoque - dt * 1.5)
      if (anilloRef.current) anilloRef.current.style.setProperty('--p', progresoEnfoque)

      estadoRef.current = { grados: mejorGrados, id: mejorId }

      // Solo se actualiza React cuando cambia (para que no vaya lento)
      const completo = progresoEnfoque >= 1
      if (completo !== estabaListo) {
        estabaListo = completo
        setListo(completo)
      }
    }
    revisar()

    return () => {
      cancelAnimationFrame(idCuadro)
      setListo(false)
      // Se silencian las aves mientras se ve la tarjeta
      visiblesRef.current.forEach((a) => {
        const sonido = avesRef.current[a.id]?.components?.sound
        if (sonido && sonido.pool) sonido.pool.children.forEach((s) => s.setVolume && s.setVolume(0))
      })
    }
  }, [activo, tarjeta])

  // ---------- Botón de foto ----------
  function tomarFoto() {
    const { grados, id } = estadoRef.current
    if (!id || grados > GRADOS_MAXIMOS_FOTO) {
      mostrarAviso('No hay ningún ave en la foto. ¡Apunta hacia ella!')
      return
    }
    const ave = AVES.find((a) => a.id === id)
    setFlash(true)
    setTimeout(() => setFlash(false), 300)

    capturar(ave.id) // queda capturada en la enciclopedia (y puede dar insignia)
    setTarjeta(ave)
    setPaso('info')
    setNumPregunta(0)
    setPuntos(0)
    setElegida(null)
  }

  // ---------- Tarjeta y quiz ----------
  const preguntas = tarjeta?.quiz ?? []

  function elegirOpcion(i) {
    if (elegida !== null) return // ya respondió esta pregunta
    setElegida(i)
    if (i === preguntas[numPregunta].correcta) setPuntos((p) => p + 1)
  }

  function siguientePregunta() {
    if (numPregunta + 1 < preguntas.length) {
      setNumPregunta((n) => n + 1)
      setElegida(null)
    } else {
      completarQuiz(tarjeta.id, puntos) // guarda el puntaje del quiz
      setPaso('fin')
    }
  }

  // Cierra la tarjeta: el ave fotografiada desaparece y se sigue buscando
  function cerrarTarjeta() {
    setEscondidas((lista) => [...lista, tarjeta.id])
    setTarjeta(null)
  }

  // Texto de ayuda del visor
  function textoPista() {
    if (!gps) return 'Buscando tu ubicación...'
    if (visibles.length === 0) return 'Camina por el campus para encontrar aves'
    return 'Gira despacio y busca a tu alrededor'
  }

  /* ====================================================================
     PANTALLA
     ==================================================================== */
  return (
    <div className="av">
      {/* Escena de A-Frame. La escena se crea solo después del toque en "Activar cámara"
          (así el iPhone deja pedir los permisos). AR.js pone la cámara de fondo (arjs). */}
      {activo && (
        <div className="av-escena">
          <a-scene
            ref={escenaRef}
            loading-screen="enabled: false"
            vr-mode-ui="enabled: false"
            arjs="sourceType: webcam; videoTexture: true; debugUIEnabled: false"
            renderer="antialias: true; alpha: true"
          >
            <a-light type="ambient" intensity="0.9"></a-light>
            <a-light type="directional" position="1 3 2" intensity="1"></a-light>

            {/* Cámara con GPS: se mueve por el mapa al caminar y gira con el giroscopio */}
            <a-camera
              id="camara"
              look-controls-enabled="false"
              arjs-device-orientation-controls="smoothingFactor: 0.1"
              gps-new-camera="gpsMinDistance: 1"
            ></a-camera>

            {/* Las aves: cada una queda fija en sus coordenadas (gps-new-entity-place).
                Si estás lejos se ve pequeña; al acercarte crece. */}
            {visibles.map((a) => (
              <a-entity
                key={a.id}
                ref={(el) => { avesRef.current[a.id] = el }}
                gltf-model={a.modelo}
                animar-glb=""
                look-at="#camara"
                gps-new-entity-place={`latitude: ${lugares[a.id].lat}; longitude: ${lugares[a.id].lng}`}
                position={`0 ${ALTURA_AVE} 0`}
                scale={`${ESCALA_AVE} ${ESCALA_AVE} ${ESCALA_AVE}`}
                sound={a.canto ? `src: url(${a.canto}); loop: true; autoplay: true; volume: 0.3` : undefined}
              ></a-entity>
            ))}
          </a-scene>
        </div>
      )}

      {/* ---------- Visor: lo que se ve mientras se busca ---------- */}
      {activo && !tarjeta && (
        <div className="av-hud">
          <button type="button" className="av-atras" onClick={() => window.open(BASE, '_self')} aria-label="Volver al inicio">←</button>

          <div className="av-pista">
            {pendientes.length === 0
              ? <><b>¡Fotografiaste todas!</b><span>Revisa tu colección en la enciclopedia</span></>
              : <><b>Quedan {pendientes.length} {pendientes.length === 1 ? 'ave' : 'aves'}</b><span>{textoPista()}</span></>}
          </div>

          <div ref={flechaRef} className="av-flecha" aria-live="polite"></div>

          {/* Anillo de enfoque y mira central */}
          <div ref={anilloRef} className={`av-anillo ${listo ? 'av-anillo--listo' : ''}`}></div>
          <div className="av-mira"></div>

          {aviso && <div className="av-aviso">{aviso}</div>}

          <button
            type="button"
            className={`av-obturador ${listo ? 'av-obturador--listo' : ''}`}
            onClick={tomarFoto}
            disabled={visibles.length === 0}
            aria-label="Tomar foto"
          ></button>
        </div>
      )}

      {/* Destello al tomar la foto */}
      {flash && <div className="av-flash"></div>}

      {/* ---------- Pantalla para activar la cámara (el iPhone exige un toque) ---------- */}
      {!activo && (
        <div className="av-panel">
          <div className="av-caja">
            <h1>Fotógrafo de aves</h1>
            <p>Camina por el campus, busca las aves con la cámara y tómales una foto.</p>
            <p className="av-pequeno">Te pediremos permiso para usar la cámara, la ubicación y el giroscopio.</p>
            <button type="button" className="av-btn av-btn--amarillo" onClick={activar}>Activar cámara</button>
            {aviso && <p className="av-aviso-caja">{aviso}</p>}
          </div>
        </div>
      )}

      {/* ---------- Tarjeta del ave capturada ---------- */}
      {tarjeta && (
        <div className="av-tarjeta-fondo">
          <article className="av-tarjeta">
            {/* Paso 1: información del ave */}
            {paso === 'info' && (
              <>
                <p className="av-etiqueta">¡Capturaste un ave!</p>
                <h2>{tarjeta.nombre}</h2>
                <p className="av-cientifico">{tarjeta.cientifico}</p>
                <p className="av-texto">{tarjeta.descripcion}</p>
                <div className="av-acciones">
                  {preguntas.length > 0 && (
                    <button type="button" className="av-btn av-btn--amarillo" onClick={() => setPaso('quiz')}>Hacer el quiz ahora</button>
                  )}
                  <button type="button" className="av-btn" onClick={cerrarTarjeta}>Después</button>
                </div>
              </>
            )}

            {/* Paso 2: preguntas del quiz (salen de aves.js) */}
            {paso === 'quiz' && preguntas[numPregunta] && (
              <>
                <p className="av-etiqueta">Pregunta {numPregunta + 1} de {preguntas.length}</p>
                <h2 className="av-pregunta">{preguntas[numPregunta].pregunta}</h2>
                <div className="av-opciones">
                  {preguntas[numPregunta].opciones.map((texto, i) => {
                    let clase = 'av-opcion'
                    if (elegida !== null && i === preguntas[numPregunta].correcta) clase += ' av-opcion--bien'
                    else if (elegida === i) clase += ' av-opcion--mal'
                    return (
                      <button key={i} type="button" className={clase} onClick={() => elegirOpcion(i)}>{texto}</button>
                    )
                  })}
                </div>
                {elegida !== null && (
                  <button type="button" className="av-btn av-btn--amarillo" onClick={siguientePregunta}>
                    {numPregunta + 1 < preguntas.length ? 'Siguiente' : 'Ver resultado'}
                  </button>
                )}
              </>
            )}

            {/* Paso 3: resultado */}
            {paso === 'fin' && (
              <>
                <p className="av-etiqueta">Quiz terminado</p>
                <h2>{puntos} de {preguntas.length}</h2>
                <p className="av-texto">
                  {puntos === preguntas.length ? '¡Perfecto! Sabes mucho de esta ave.' : 'Puedes repetirlo desde la enciclopedia.'}
                </p>
                <button type="button" className="av-btn av-btn--amarillo" onClick={cerrarTarjeta}>Seguir buscando</button>
              </>
            )}
          </article>
        </div>
      )}
    </div>
  )
}

export default Aviario