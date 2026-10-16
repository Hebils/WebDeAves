import { useEffect, useMemo, useRef, useState } from 'react'
import AFRAME from 'aframe'
import { AVES } from './data/aves.js'
import { useProgreso } from './Progreso.js'
import './aviario.css'
import MapaCampus from './MapaCampus.jsx'
import { useUbicacion, puntoMasCercano, textoDistancia } from './ubicacion.js'
import { EXIGIR_CERCANIA, RADIO_PUNTO, asignarAves } from './data/puntos.js'

/* ======================================================================
   EXPERIENCIA DE RA: el usuario es un fotógrafo de aves.
   - La cámara del celular se ve de fondo.
   - Las aves (modelos 3D de A-Frame) aparecen en lugares aleatorios alrededor.
   - Se busca el ave, se mantiene centrada para enfocarla y se toca el botón de foto.
   - Al tomar la foto sale la tarjeta del ave, con el quiz opcional.
   ====================================================================== */

// ---------- Ajustes (se pueden cambiar fácil) ----------
const ESCALA_AVE = 1            // tamaño de los modelos 3D (sube o baja según se vean)
const GRADOS_ENFOQUE = 10       // qué tan centrada debe estar el ave para enfocarla
const SEGUNDOS_ENFOQUE = 2      // cuánto tiempo hay que mantenerla centrada
const GRADOS_MAXIMOS_FOTO = 25  // si el ave está más lejos del centro, no sale en la foto

const BASE = import.meta.env.BASE_URL // se usa para volver a la portada

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

// Posición aleatoria de un ave: a 4–7 metros del usuario.
// Cada ave tiene su "tajada" del círculo para que no queden encimadas.
function posicionAleatoria(i, total) {
    const angulo = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    const distancia = 4 + Math.random() * 3
    const x = Math.sin(angulo) * distancia
    const z = -Math.cos(angulo) * distancia
    const y = -0.8 + Math.random() * 1.2 // un poco abajo o arriba de los ojos
    return `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`
}

// Pide el permiso de ubicación (el navegador muestra su aviso).
// Devuelve false solo si el usuario lo negó o no hubo respuesta; si el GPS tarda o falla, el permiso sí estaba dado.
function pedirUbicacion() {
    return new Promise((resolver) => {
        if (!('geolocation' in navigator)) return resolver(false)
        // Algunos navegadores (por ejemplo dentro de apps de mensajería) nunca responden: no se espera para siempre
        const espera = setTimeout(() => resolver(false), 12000)
        const terminar = (ok) => { clearTimeout(espera); resolver(ok) }
        navigator.geolocation.getCurrentPosition(
            () => terminar(true),
            (error) => terminar(error.code !== 1), // 1 = permiso negado
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 },
        )
    })
}

function Aviario() {
    // ---------- Estados ----------
    const { progreso, capturar, completarQuiz } = useProgreso()
    const [activo, setActivo] = useState(false)      // false = pantalla "Activar cámara"
    const [pidiendo, setPidiendo] = useState(false)  // true mientras se piden los permisos
    const [aviso, setAviso] = useState('')           // mensaje corto
    const [listo, setListo] = useState(false)        // true cuando el ave está bien enfocada
    const [flash, setFlash] = useState(false)        // destello blanco al tomar la foto
    const [escondidas, setEscondidas] = useState([]) // aves ya fotografiadas (desaparecen)
    const [llegadas, setLlegadas] = useState([])     // aves que ya aparecieron en la escena
    const [mapaAbierto, setMapaAbierto] = useState(false) // mapa del campus
    const [notis, setNotis] = useState([])                // notificaciones
    const [coleccionAbierta, setColeccionAbierta] = useState(false) // colección dentro de la experiencia
    const [asignacion] = useState(() => asignarAves(progreso.capturadas ?? [])) // qué ave hay en cada punto (al azar)
    const ubic = useUbicacion(activo) // GPS + modo demo

    // Tarjeta del ave capturada y su quiz
    const [tarjeta, setTarjeta] = useState(null)     // ave capturada (null = sin tarjeta)
    const [paso, setPaso] = useState('info')         // 'info' | 'quiz' | 'fin'
    const [numPregunta, setNumPregunta] = useState(0)
    const [puntos, setPuntos] = useState(0)
    const [elegida, setElegida] = useState(null)     // opción que tocó el usuario

    // ---------- Referencias ----------
    const videoRef = useRef(null)    // video de la cámara (fondo)
    const escenaRef = useRef(null)   // <a-scene>
    const avesRef = useRef({})       // elementos 3D de las aves, por id
    const anilloRef = useRef(null)   // anillo de enfoque
    const flechaRef = useRef(null)   // texto "gira a la izquierda/derecha"
    const estadoRef = useRef({ grados: 180, id: null }) // lo que se ve en vivo
    const visiblesRef = useRef([])

    // ---------- Aves que aparecen ----------
    // Se eligen una sola vez: las que el usuario aún no ha capturado.
    // Si ya las capturó todas, aparecen todas de nuevo.
    const aves = useMemo(() => {
    const ids = Object.values(asignacion)
    return ids.map((id, i) => ({ ...AVES.find((a) => a.id === id), posicion: posicionAleatoria(i, ids.length) }))
}, [])

    const pendientes = aves.filter((a) => !escondidas.includes(a.id))   // aún no fotografiadas
    const visibles = pendientes.filter((a) => llegadas.includes(a.id)) // las que ya aparecieron
    visiblesRef.current = visibles

    // Punto de interés más cercano y si el usuario ya "llegó" a él
    const cercano = puntoMasCercano(ubic.posicion)
    const dentro = cercano && cercano.distancia <= RADIO_PUNTO ? cercano.punto : null

    // Al llegar a un punto, aparece el ave que le tocó a ese punto
    useEffect(() => {
        if (!activo || !EXIGIR_CERCANIA || !dentro) return
        const aveId = asignacion[dentro.id]
        if (!aveId || escondidas.includes(aveId)) return
        setLlegadas((l) => (l.includes(aveId) ? l : [...l, aveId]))
    }, [activo, dentro?.id])

    // La colección (iframe) avisa cuando el usuario toca "volver"
    // La colección (iframe) avisa cuando el usuario toca "volver"
    useEffect(() => {
    const alMensaje = (e) => {
        if (e.data?.tipo === 'cerrar-coleccion') setColeccionAbierta(false)
    }
    window.addEventListener('message', alMensaje)
    return () => window.removeEventListener('message', alMensaje)
    }, [])

    function mostrarAviso(texto, ms = 2800) {
    setAviso(texto)
    setTimeout(() => setAviso(''), ms)
    }

    // Notificación que aparece abajo y se va sola (máximo 3 a la vez)
    function notificar(titulo, texto, ms = 4000) {
    const id = Date.now() + Math.random()
    setNotis((l) => [...l.slice(-2), { id, titulo, texto, ms }])
    setTimeout(() => setNotis((l) => l.filter((n) => n.id !== id)), ms)
}

    // ---------- Hacer la escena transparente (para ver la cámara detrás) ----------
    useEffect(() => {
        const escena = escenaRef.current
        if (!escena) return
        function hacerTransparente() {
            escena.object3D.background = null
            escena.renderer.setClearColor(0x000000, 0)
        }
        if (escena.hasLoaded) hacerTransparente()
        else escena.addEventListener('loaded', hacerTransparente)
        return () => escena.removeEventListener('loaded', hacerTransparente)
    }, [])

    // ---------- Las aves llegan poco a poco, en orden aleatorio ----------
    useEffect(() => {
        if (!activo || EXIGIR_CERCANIA) return
        const orden = [...aves].sort(() => Math.random() - 0.5) // orden al azar
        const temporizadores = []
        let espera = 0
        orden.forEach((a, i) => {
            // La primera llega a los 2 segundos. Las demás, entre 6 y 15 segundos después de la anterior.
            espera += i === 0 ? 2000 : 6000 + Math.random() * 9000
            temporizadores.push(setTimeout(() => setLlegadas((l) => [...l, a.id]), espera))
        })
        return () => temporizadores.forEach(clearTimeout)
    }, [activo])

    // Notificación cada vez que llega un ave nueva
    useEffect(() => {
    if (llegadas.length === 0) return
    notificar('¡Un ave apareció!', 'Gira despacio y búscala a tu alrededor')
    }, [llegadas.length])

        // ---------- Botón "ACTIVAR PERMISOS": pide giroscopio, ubicación y cámara (dentro del mismo toque) ----------
    async function activar() {
        if (pidiendo) return
        setPidiendo(true)
        const avisos = [] // lo que no se pudo activar

        // 1) Desbloquear el audio (los navegadores solo lo permiten después de un toque)
        try { AFRAME.THREE.AudioContext.getContext().resume() } catch { /* sigue */ }

        // 2) Giroscopio (iPhone)
        const D = window.DeviceOrientationEvent
        if (D && typeof D.requestPermission === 'function') {
            try {
                const respuesta = await D.requestPermission()
                if (respuesta !== 'granted') avisos.push('Sin giroscopio no podrás girar el celular para buscar aves.')
            } catch { avisos.push('No se pudo activar el giroscopio.') }
        }

        // 3) Ubicación
        if (!(await pedirUbicacion())) avisos.push('Sin ubicación no podremos ubicarte en el campus.')

        // 4) Cámara trasera como fondo
        try {
            const flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
            videoRef.current.srcObject = flujo
            await videoRef.current.play()
        } catch {
            avisos.push('No se pudo abrir la cámara. Puedes seguir, pero verás fondo oscuro.')
        }

        if (avisos.length > 0) notificar('Permisos', avisos.join(' '), 6000)
        setPidiendo(false)
        setActivo(true)
        notificar(
        `Quedan ${aves.length} ${aves.length === 1 ? 'ave' : 'aves'}`,
        EXIGIR_CERCANIA ? 'Acércate a un punto de interés del mapa' : 'Espera... un ave está por llegar',
        )
        }

    // ---------- Mientras se busca: revisa en cada cuadro dónde están las aves ----------
    useEffect(() => {
        if (!activo || tarjeta || mapaAbierto || coleccionAbierta) return
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
    }, [activo, tarjeta, mapaAbierto, coleccionAbierta])

    // ---------- Botón de foto ----------
    function tomarFoto() {
        const { grados, id } = estadoRef.current
        if (!id || grados > GRADOS_MAXIMOS_FOTO) {
            notificar('Sin ave en la foto', '¡Apunta hacia ella y mantenla centrada!')
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
            completarQuiz(tarjeta.id, puntos, preguntas.length)
            setPaso('fin')
        }
    }

    // Cierra la tarjeta: el ave fotografiada desaparece y se sigue buscando
    function cerrarTarjeta() {
        const quedan = pendientes.length - 1
        if (quedan > 0) notificar(`Quedan ${quedan} ${quedan === 1 ? 'ave' : 'aves'}`, 'Sigue buscando a tu alrededor')
        else notificar('¡Fotografiaste todas!', 'Revisa tu colección')
        setEscondidas((lista) => [...lista, tarjeta.id])
        setTarjeta(null)
    }

    /* ====================================================================
       PANTALLA
       ==================================================================== */
    return (
        <div className="av">
            {/* Fondo: la cámara del celular */}
            <video ref={videoRef} className="av-video" playsInline muted autoPlay />

            {/* Escena de A-Frame (transparente, encima de la cámara) */}
            <div className="av-escena">
                <a-scene
                    ref={escenaRef}
                    embedded=""
                    background="transparent: true"
                    renderer="alpha: true; antialias: true"
                    xr-mode-ui="enabled: false"
                    vr-mode-ui="enabled: false"
                    device-orientation-permission-ui="enabled: false"
                    loading-screen="enabled: false"
                >
                    <a-light type="ambient" intensity="0.9"></a-light>
                    <a-light type="directional" position="1 3 2" intensity="1"></a-light>

                    {/* Cámara: gira con el giroscopio (en computador, arrastrando el mouse) */}
                    <a-entity id="camara" camera="" look-controls="touchEnabled: false" position="0 0 0"></a-entity>

                    {/* Las aves: cada una aparece en su posición aleatoria */}
                    {activo && visibles.map((a) => (
                        <a-entity
                            key={a.id}
                            ref={(el) => { avesRef.current[a.id] = el }}
                            gltf-model={a.modelo}
                            animar-glb=""
                            look-at="#camara"
                            position={a.posicion}
                            scale={`${ESCALA_AVE} ${ESCALA_AVE} ${ESCALA_AVE}`}
                            sound={a.canto ? `src: url(${a.canto}); loop: true; autoplay: true; volume: 0.3` : undefined}
                        ></a-entity>
                    ))}
                </a-scene>
            </div>

            {/* ---------- Visor: lo que se ve mientras se busca ---------- */}
            {activo && !tarjeta && (
    <div className="av-hud">
        {/* Cabezal: volver · logo UAO · logo Aves */}
        <header className="av-cabezal">
            <button type="button" className="av-cab-atras" onClick={() => window.location.assign('./index.html')} aria-label="Volver al inicio">←</button>
            <img className="av-cab-uao" src={`${BASE}img/uao-blanco.png`} alt="Universidad Autónoma de Occidente" />
            <img className="av-cab-ave" src={`${BASE}img/ave-logo.png`} alt="WebAves" />
        </header>

        <div className={`av-cercania ${dentro ? 'av-cercania--dentro' : ''}`} aria-live="polite">
        {ubic.error === 'negado' ? 'Activa la ubicación para ver los puntos'
        : !ubic.posicion ? 'Buscando tu ubicación…'
        : dentro ? (asignacion[dentro.id] ? `¡Estás en ${dentro.nombre}!` : `${dentro.nombre}: sin ave por ahora`)
        : ` ${cercano.punto.nombre} · a ${textoDistancia(cercano.distancia)}`}
        {ubic.demo && ' (demo)'}
        </div>

        <div ref={flechaRef} className="av-flecha" aria-live="polite"></div>

        {/* Anillo de enfoque y mira central */}
        <div ref={anilloRef} className={`av-anillo ${listo ? 'av-anillo--listo' : ''}`}></div>
        <div className="av-mira"></div>

        {/* Notificaciones */}
        <div className="av-notis" aria-live="polite">
            {notis.map((n) => (
                <div key={n.id} className="av-noti" style={{ '--vida': `${n.ms}ms` }}>
                    <b>{n.titulo}</b>
                    <span>{n.texto}</span>
                </div>
            ))}
        </div>

        {/* Barra inferior tipo cámara: Mapa · Disparador · Colección */}
<div className="av-barra">
    <button type="button" className="av-barra-btn" onClick={() => setMapaAbierto(true)}>
        <span className="av-barra-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
            </svg>
        </span>
        <span>Mapa</span>
    </button>

    <button
        type="button"
        className={`av-disparo ${listo ? 'av-disparo--listo' : ''}`}
        onClick={tomarFoto}
        disabled={visibles.length === 0}
        aria-label="Tomar foto"
    ></button>

    <button type="button" className="av-barra-btn" onClick={() => setColeccionAbierta(true)}>
        <span className="av-barra-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
        </span>
        <span>Colección</span>
    </button>
    </div>
</div>
)}

            {/* Destello al tomar la foto */}
            {flash && <div className="av-flash"></div>}

            {mapaAbierto && (
        <MapaCampus
            asignacion={asignacion}
            capturadas={progreso.capturadas ?? []}
            ubic={ubic}
            onCerrar={() => setMapaAbierto(false)}
        />
        )}

    {/* La colección se abre encima, sin salir de la experiencia (así no se pierden cámara ni permisos) */}
    {coleccionAbierta && (
        <iframe className="av-coleccion" src={`${BASE}Enciclopedia.html?embebido=1`} title="Colección de aves"></iframe>
    )}

            {/* ---------- Introducción: contexto de la experiencia y botón para activar permisos ---------- */}
            {!activo && (
                <div className="av-panel">
                    <button type="button" className="av-atras-intro" onClick={() => window.location.assign('./index.html')} aria-label="Volver al inicio">←</button>
                    <div className="av-caja av-caja--intro">
                        <img
                            className="av-intro-foto"
                            src={`${BASE}img/camara.png`}
                            alt="Manos sosteniendo una cámara fotográfica que muestra un loro verde en la pantalla"
                        />
                        <div className="av-intro-cuerpo">
                            <h1>Fotógrafo de aves</h1>
                            <p className="av-intro-lead">Convierte tu celular en una cámara y descubre las aves que viven en el campus de la UAO.</p>
                            <p>Las aves aparecen a tu alrededor en realidad aumentada. Gira despacio para buscarlas, escucha sus cantos y fotografíalas para sumarlas a tu enciclopedia.</p>

                            <h2>Cómo se juega</h2>
                            <ol className="av-pasos">
                                <li>Gira el celular para buscar. Una flecha te indica hacia dónde ir.</li>
                                <li>Centra el ave en el anillo y mantenla quieta un par de segundos para enfocarla.</li>
                                <li>Toca el botón de foto para capturarla.</li>
                                <li>Lee su ficha y, si quieres, responde su quiz para ganar logros.</li>
                            </ol>

                            <h2>Permisos que necesitamos</h2>
                            <ul className="av-permisos">
                                <li><b>Cámara</b><span>Para ver el campus detrás de las aves.</span></li>
                                <li><b>Ubicación</b><span>Para ubicarte en el campus.</span></li>
                                <li><b>Giroscopio</b><span>Para saber hacia dónde apuntas el celular.</span></li>
                            </ul>

                            <button type="button" className="av-btn av-btn--amarillo" onClick={activar} disabled={pidiendo}>
                                {pidiendo ? 'ACTIVANDO…' : 'ACTIVAR PERMISOS'}
                            </button>
                            {aviso && <p className="av-aviso-caja">{aviso}</p>}
                        </div>
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