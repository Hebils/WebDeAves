// Ayudas para el equipo de desarrollo (panel secreto del menú: toca 5 veces el logo UAO).
//
// OJO: el código viaja dentro del JavaScript de la página. Sirve para que los usuarios
// normales no se encuentren estas opciones, pero NO es seguridad: cualquiera que lea el
// código fuente puede verlo. No pongas aquí nada que deba estar realmente protegido.

export const CODIGO_DEV = '2117'

// Cuántos toques seguidos al logo abren el panel, y en cuánto tiempo (milisegundos).
// Para abrirlo con un solo toque: TOQUES_PARA_ABRIR = 1
export const TOQUES_PARA_ABRIR = 5
export const VENTANA_TOQUES_MS = 3000

const CLAVE_SESION = 'webaves-uao-dev-sesion'        // sessionStorage: se borra al cerrar la pestaña
const CLAVE_CAPTURA_PRUEBA = 'webaves-uao-modo-captura-prueba' // localStorage

// ¿Ya se escribió el código en esta pestaña? (así no se pide otra vez cada vez que abres el panel)
export function sesionDevActiva() {
  try {
    return sessionStorage.getItem(CLAVE_SESION) === '1'
  } catch {
    return false
  }
}

export function activarSesionDev() {
  try {
    sessionStorage.setItem(CLAVE_SESION, '1')
  } catch {
    /* sin almacenamiento: se pedirá el código cada vez */
  }
}

export function cerrarSesionDev() {
  try {
    sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    /* nada */
  }
}

// MODO CAPTURA DE PRUEBA
// El panel solo guarda esta casilla. El aviario la debe LEER para saltarse la ubicación:
//
//   import { modoCapturaPrueba } from './Desarrollo.js'
//   if (modoCapturaPrueba()) { /* permitir capturar sin estar en el punto del ave */ }
export function modoCapturaPrueba() {
  try {
    return localStorage.getItem(CLAVE_CAPTURA_PRUEBA) === '1'
  } catch {
    return false
  }
}

export function guardarModoCapturaPrueba(activo) {
  try {
    if (activo) localStorage.setItem(CLAVE_CAPTURA_PRUEBA, '1')
    else localStorage.removeItem(CLAVE_CAPTURA_PRUEBA)
  } catch {
    /* nada */
  }
}
