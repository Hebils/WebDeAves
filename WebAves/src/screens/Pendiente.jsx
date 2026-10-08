export default function Pendiente({ titulo, onVolver }) {
  return (
    <main className="inicio inicio--simple">
      <h2 className="pendiente__titulo">{titulo}</h2>
      <p className="desc">Pantalla en construcción.</p>
      <button className="btn" style={{ '--d': '0s' }} onClick={onVolver}>VOLVER</button>
    </main>
  )
}