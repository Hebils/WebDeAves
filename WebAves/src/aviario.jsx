import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Aviario from './aviarioHtml.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Aviario />
  </StrictMode>,
)
