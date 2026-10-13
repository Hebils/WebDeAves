import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Aviario from './aviarioHtml.jsx'
import { AVES } from './data/aves.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Aviario />
  </StrictMode>,
)
