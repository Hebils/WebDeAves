// Pantalla inicial. Sigue el boceto: título (imagen), descripción,
// INICIAR / COLECCIÓN / LOGROS y logo UAO abajo.
const TITULO_IMG = null // cuando tengas la imagen: 'img/titulo.png'
const LETRAS = 'WebAves'.split('')

// ---------- Capas de aves (profundidad / parallax) ----------
// Para tener más o menos aves, cambia "n". Para otra capa, agrega un objeto.
const CAPAS = [
  { nombre: 'lejos', n: 7, ancho: [20, 28], opacidad: 0.12, duracion: [40, 55], top: [4, 88], blur: 0 },
  { nombre: 'medio', n: 5, ancho: [34, 46], opacidad: 0.22, duracion: [26, 36], top: [8, 85], blur: 0 },
  { nombre: 'cerca', n: 3, ancho: [64, 84], opacidad: 0.3,  duracion: [14, 20], top: [10, 80], blur: 1.5 },
]

// Números "al azar" pero fijos (así las aves no cambian al volver a renderizar)
const azar = (semilla) => {
  const x = Math.sin(semilla * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
const rango = ([a, b], semilla) => a + (b - a) * azar(semilla)

const AVES_FONDO = CAPAS.flatMap((c, ci) =>
  Array.from({ length: c.n }, (_, i) => {
    const s = ci * 100 + i + 1
    return {
      key: `${c.nombre}-${i}`,
      invertida: azar(s + 0.5) > 0.5, // vuela hacia la izquierda
      style: {
        '--top': `${rango(c.top, s)}%`,
        '--w': `${rango(c.ancho, s + 0.1)}px`,
        '--op': c.opacidad,
        '--dur': `${rango(c.duracion, s + 0.2)}s`,
        '--delay': `${rango([3, 18], s + 0.3)}s`,
        '--blur': `${c.blur}px`,
        '--aleteo': `${rango([0.3, 0.55], s + 0.4)}s`,
      },
    }
  })
)

// Silueta de ave con alas que aletean (solo SVG + CSS).
function Ave({ style, invertida }) {
  return (
    <div className={`ave${invertida ? ' ave--inv' : ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 64 40">
        <g className="ala ala--izq">
          <path d="M32 24 C24 8 10 6 0 12 C10 14 20 20 32 28Z" />
        </g>
        <g className="ala ala--der">
          <path d="M32 24 C40 8 54 6 64 12 C54 14 44 20 32 28Z" />
        </g>
        <path d="M24 27 L12 33 L26 31Z" />
        <ellipse cx="32" cy="26" rx="8" ry="5" />
        <circle cx="39" cy="22" r="3.6" />
        <path d="M42 21.5 L48 23.2 L42 24.6Z" />
      </svg>
    </div>
  )
}

export default function Inicio({ onNavegar }) {
  return (
    <main className="inicio">
      <div className="cielo" aria-hidden="true">
        {AVES_FONDO.map(({ key, ...ave }) => (
          <Ave key={key} {...ave} />
        ))}
      </div>

      <header className="titulo">
        <svg className="marco" aria-hidden="true">
          <rect x="2" y="2" width="98%" height="95%" rx="6" pathLength="1" />
        </svg>
        {TITULO_IMG ? (
          <img className="titulo__img" src={TITULO_IMG} alt="WebAves UAO" />
        ) : (
          <h1 aria-label="WebAves UAO">
            <span className="titulo__palabra" aria-hidden="true">
              {LETRAS.map((l, i) => (
                <span className="letra" style={{ '--i': i }} key={i}>{l}</span>
              ))}
            </span>
            <span className="titulo__sub" aria-hidden="true">UAO</span>
          </h1>
        )}
      </header>

      <p className="desc">
        Recorre el campus, escucha el canto de las aves, captúralas y
        aprende sobre ellas. ¡Completa los quices y gana insignias!
      </p>

      <nav className="menu">
        <button className="btn btn--principal" style={{ '--d': '1.5s' }} onClick={() => onNavegar('juego')}>
          INICIAR
        </button>
        <button className="btn" style={{ '--d': '1.65s' }} onClick={() => onNavegar('coleccion')}>
          COLECCIÓN
        </button>
        <button className="btn" style={{ '--d': '1.8s' }} onClick={() => onNavegar('logros')}>
          LOGROS
        </button>
      </nav>

      <footer className="logo">
        <img src={`${import.meta.env.BASE_URL}img/uao-blanco.png`} alt="Universidad Autónoma de Occidente" />
      </footer>
    </main>
  )
}