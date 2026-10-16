import { useEffect, useMemo, useRef, useState } from 'react'
import { AVES } from './data/aves.js'
import { useProgreso } from './Progreso.js'
import './aviario.css'

/* ======================================================================
   EXPERIENCIA DE RA CON GPS: el usuario es un fotógrafo de aves.
   - La cámara del celular se ve de fondo (un <video> propio).
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
const MAX_AVES_A_LA_VEZ = 2     // máximo de modelos 3D en la escena (menos memoria = menos cierres)
const PRECISION_MINIMA = 25     // el GPS debe tener un error menor a estos metros antes de colocar las aves (modo demo)
const FOV_CAMARA = 65           // ángulo de visión de la cámara 3D; debe parecerse al de la cámara real para que el ave "pegue" con el fondo
const GRADOS_ENFOQUE = 10       // qué tan centrada debe estar el ave para enfocarla
const SEGUNDOS_ENFOQUE = 2      // cuánto tiempo hay que mantenerla centrada
const GRADOS_MAXIMOS_FOTO = 25  // si el ave está más lejos del centro, no sale en la foto

const BASE = import.meta.env.BASE_URL
const VERSION_CODIGO = 'v6 · medidas de pantalla' // se ve con ?debug: sirve para saber si el celular cargó la versión nueva

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
  const [errorCamara, setErrorCamara] = useState('') // mensaje si no se pudo abrir la cámara

  // Tarjeta del ave capturada y su quiz
  const [tarjeta, setTarjeta] = useState(null)     // ave capturada (null = sin tarjeta)
  const [paso, setPaso] = useState('info')         // 'info' | 'quiz' | 'fin'
  const [numPregunta, setNumPregunta] = useState(0)
  const [puntos, setPuntos] = useState(0)
  const [elegida, setElegida] = useState(null)     // opción que tocó el usuario

  // ---------- Referencias ----------
  const videoRef = useRef(null)    // video de la cámara (fondo)
  const escenaRef = useRef(null)   // <a-scene>
  const depuracionRef = useRef(null) // texto de ayuda para pruebas (solo con ?debug en la dirección)
  const avesRef = useRef({})       // elementos 3D de las aves, por id
  const anilloRef = useRef(null)   // anillo de enfoque
  const flechaRef = useRef(null)   // texto "gira a la izquierda/derecha"
  const estadoRef = useRef({ grados: 180, id: null }) // lo que se ve en vivo
  const visiblesRef = useRef([])
  const gpsRef = useRef(null)
  const infoRef = useRef({ permiso: '?', camara: 'sin pedir', modelosOk: 0, modelosError: 0, contextoPerdido: false }) // datos para ?debug

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
  // Solo las que no se han fotografiado y están dentro de su radio de aparición (máximo MAX_AVES_A_LA_VEZ).
  const pendientes = aves.filter((a) => !escondidas.includes(a.id))
  const visibles = pendientes
    .filter((a) => {
      const lugar = lugares[a.id]
      if (!gps || !lugar) return false
      return distanciaMetros(gps.lat, gps.lng, lugar.lat, lugar.lng) <= (a.radio ?? RADIO_POR_DEFECTO)
    })
    .slice(0, MAX_AVES_A_LA_VEZ)
  visiblesRef.current = visibles
  gpsRef.current = gps

  // Cuenta cuántos modelos 3D cargaron bien o con error (se ve con ?debug)
  function vigilarModelo(el) {
    if (!el || el.dataset.vigilado) return
    el.dataset.vigilado = '1'
    el.addEventListener('model-loaded', () => { infoRef.current.modelosOk += 1 })
    el.addEventListener('model-error', () => { infoRef.current.modelosError += 1 })
  }

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

    // 3) Cámara trasera como fondo
    const info = infoRef.current
    try {
      const permiso = await navigator.permissions.query({ name: 'camera' })
      info.permiso = permiso.state // 'prompt' = lo va a pedir, 'denied' = está bloqueado
    } catch { info.permiso = 'no se pudo leer' }

    try {
      // Se pide alta resolución con la proporción de la pantalla; si no se pide, el celular da 640x480
      // y se ve borroso y con zoom al estirarlo a pantalla completa.
      const vertical = window.innerHeight > window.innerWidth
      const flujo = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: vertical ? 1080 : 1920 },
          height: { ideal: vertical ? 1920 : 1080 },
        },
        audio: false,
      })
      videoRef.current.srcObject = flujo
      await videoRef.current.play()
      info.camara = 'abierta'
      setErrorCamara('')
    } catch (e) {
      // Sin cámara no se puede jugar: se queda en esta pantalla y se explica qué hacer
      info.camara = `ERROR ${e.name}`
      setErrorCamara(`No se pudo abrir la cámara (${e.name}). Toca el candado junto a la dirección, entra a Permisos, permite la Cámara y vuelve a tocar el botón.`)
      return
    }

    // 4) Ubicación: se sigue en vivo para saber qué aves están cerca
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (p) => {
          const punto = { lat: p.coords.latitude, lng: p.coords.longitude }
          setGps({ ...punto, precision: Math.round(p.coords.accuracy) })
          // Para el modo demo se guarda la primera ubicación PRECISA (la primera lectura suele ser mala)
          if (p.coords.accuracy <= PRECISION_MINIMA) setOrigen((o) => o ?? punto)
        },
        () => mostrarAviso('No se pudo leer tu ubicación. Activa el GPS.'),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
      )
    }

    // 5) Se crea la escena
    setActivo(true)
  }

  // ---------- Hacer la escena transparente (para ver la cámara detrás) ----------
  useEffect(() => {
    const escena = escenaRef.current
    if (!activo || !escena) return
    function hacerTransparente() {
      escena.object3D.background = null
      escena.renderer.setClearColor(0x000000, 0)
      // Si el celular se queda sin memoria gráfica, el navegador pierde el "contexto" y la escena se congela
      escena.canvas.addEventListener('webglcontextlost', () => { infoRef.current.contextoPerdido = true })
    }
    if (escena.hasLoaded) hacerTransparente()
    else escena.addEventListener('loaded', hacerTransparente)
    return () => escena.removeEventListener('loaded', hacerTransparente)
  }, [activo])

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

  // ---------- Ayuda para pruebas (solo con ?debug en la dirección) ----------
  // Muestra el estado de todo cada medio segundo, para saber qué falla.
  useEffect(() => {
    if (!activo || tarjeta || !depuracionRef.current) return
    const THREE = AFRAME.THREE
    const posCamara = new THREE.Vector3()
    const posAve = new THREE.Vector3()

    const id = setInterval(() => {
      const escena = escenaRef.current
      const info = infoRef.current
      let masCerca = '-'
      if (escena && escena.camera) {
        escena.camera.getWorldPosition(posCamara)
        let minimo = null
        visiblesRef.current.forEach((a) => {
          const el = avesRef.current[a.id]
          if (!el || !el.object3D) return
          el.object3D.getWorldPosition(posAve)
          const d = posCamara.distanceTo(posAve)
          if (minimo === null || d < minimo) minimo = d
        })
        if (minimo !== null) masCerca = `${minimo.toFixed(1)} m`
      }
      depuracionRef.current.textContent = [
        VERSION_CODIGO,
        `Cámara: permiso ${info.permiso} · ${info.camara} · video ${videoRef.current?.videoWidth || 0}px`,
        `Escena: ${escena && escena.canvas ? `${escena.canvas.width}x${escena.canvas.height}` : 'sin crear'}`,
        `Modelos: ${info.modelosOk} cargados, ${info.modelosError} con error · a la vista: ${visiblesRef.current.length}`,
        `GPS ±${gpsRef.current?.precision ?? '?'} m · ave más cercana: ${masCerca}`,
        `Pantalla: ventana ${window.innerWidth}x${window.innerHeight} · visible ${Math.round(window.visualViewport?.width || 0)}x${Math.round(window.visualViewport?.height || 0)} (zoom ${(window.visualViewport?.scale || 1).toFixed(2)}) · visor ${document.querySelector('.av')?.clientWidth}x${document.querySelector('.av')?.clientHeight}`,
        `WebGL: ${info.contextoPerdido ? 'PERDIDO (sin memoria)' : 'ok'} · memoria JS: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'n/d'}`,
      ].join('\n')
    }, 500)
    return () => clearInterval(id)
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
    if (visibles.length > 0) return 'Gira despacio y busca a tu alrededor'
    if (MODO_DEMO && !origen) return `Esperando un GPS más preciso (±${gps.precision} m)...`
    return 'Camina por el campus para encontrar aves'
  }

  /* ====================================================================
     PANTALLA
     ==================================================================== */
  return (
    <div className="av">
      {/* Fondo: la cámara del celular */}
      <video ref={videoRef} className="av-video" playsInline muted autoPlay />

      {/* Escena de A-Frame (transparente, encima de la cámara).
          Se crea solo después del toque en "Activar cámara" (así el iPhone deja pedir los permisos). */}
      {activo && (
        <div className="av-escena">
          <a-scene
            ref={escenaRef}
            embedded=""
            loading-screen="enabled: false"
            vr-mode-ui="enabled: false"
            renderer="antialias: false; alpha: true"
          >
            <a-light type="ambient" intensity="0.9"></a-light>
            <a-light type="directional" position="1 3 2" intensity="1"></a-light>

            {/* Cámara con GPS: se mueve por el mapa al caminar y gira con el giroscopio */}
            <a-camera
              id="camara"
              fov={FOV_CAMARA}
              look-controls-enabled="false"
              arjs-device-orientation-controls="smoothingFactor: 0.1"
              gps-new-camera="gpsMinDistance: 5; positionMinAccuracy: 25"
            ></a-camera>

            {/* Las aves: cada una queda fija en sus coordenadas (gps-new-entity-place).
                Si estás lejos se ve pequeña; al acercarte crece. */}
            {visibles.map((a) => (
              <a-entity
                key={a.id}
                ref={(el) => { avesRef.current[a.id] = el; vigilarModelo(el) }}
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

          {/* Solo aparece si la dirección termina en ?debug */}
          {new URLSearchParams(window.location.search).has('debug') && (
            <div ref={depuracionRef} className="av-depuracion"></div>
          )}

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
            {errorCamara && <p className="av-aviso-caja">{errorCamara}</p>}
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
