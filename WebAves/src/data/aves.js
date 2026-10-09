// Datos de las 5 aves de WebAves UAO.
// Fuente: "Guía Ilustrada de las Aves del campus de la UAO" (1.ª ed., 2023).
// Las descripciones están resumidas a partir de la guía; las preguntas del quiz
// usan solo datos que aparecen en ella.
//
// PENDIENTES por ave (busca "null" y "PROVISIONAL"):
//  - lat / lng: medir en el campus el punto donde aparecerá cada ave
//  - canto: ruta del MP3 dentro de public/ (p. ej. 'audio/curucutu.mp3')
//  - modelo: .glb propio de cada ave (hoy todas usan buho.glb)

export const AVES = [
  {
    id: 'currucutu',
    nombre: 'Currucutú',
    cientifico: 'Megascops choliba',
    familia: 'Strigidae',
    ingles: 'Tropical Screech-Owl',
    wikiaves: 'https://wikiaves.icesi.edu.co/birds/2977',
    descripcion:
      'Búho pequeño, marrón grisáceo, con rayas finas en el pecho y marcas negras alrededor de la cara. ' +
      'Es mucho más fácil de identificar por su canto que por la vista: un trino rápido y corto con un "pop" al final. ' +
      'Vive en zonas arboladas y a veces en jardines con árboles dispersos.',
    lat: null, lng: null, radio: 25,
    canto: null,
    modelo: 'buho.glb',
    imagen: '/imgAves/currucutu.jpg',
    ilustracion: '/imgAves/currucutu-ilustracion.png',
    quiz: [
      {
        pregunta: '¿Cómo es más fácil identificar a un currucutú?',
        opciones: ['Por su canto', 'Por el color de sus alas', 'Por su vuelo', 'Por su tamaño'],
        correcta: 0,
      },
      {
        pregunta: '¿Cómo termina su trino?',
        opciones: ['Con un silbido largo', 'Con un "pop"', 'Con un chillido agudo', 'Con un graznido'],
        correcta: 1,
      },
      {
        pregunta: '¿Dónde se encuentra normalmente?',
        opciones: ['En cuevas', 'Sobre el agua', 'En hábitats arbolados y jardines con árboles', 'Solo en zonas sin vegetación'],
        correcta: 2,
      },
    ],
  },
  {
    id: 'torcaza',
    nombre: 'Torcaza Nagüiblanca',
    cientifico: 'Zenaida auriculata',
    familia: 'Columbidae',
    ingles: 'Eared Dove',
    wikiaves: 'https://wikiaves.icesi.edu.co/birds/3906',
    descripcion:
      'La paloma más abundante y ampliamente distribuida de Suramérica, desde el nivel del mar hasta los 4.000 m. ' +
      'Es marrón grisácea, con un parche iridiscente en el cuello, manchas negras en las alas y patas rojizas. ' +
      'Frecuenta lugares abiertos, pueblos y ciudades, y a menudo anda en bandadas.',
    lat: null, lng: null, radio: 25,
    canto: null,
    modelo: 'buho.glb', // PROVISIONAL
    imagen: '/imgAves/torcaza.jpg',
    ilustracion: '/imgAves/torcaza-ilustracion.png',
    quiz: [
      {
        pregunta: '¿Hasta qué altura puede encontrarse la torcaza?',
        opciones: ['Solo a nivel del mar', 'Hasta 500 m', 'Hasta 4.000 m', 'Solo sobre 5.000 m'],
        correcta: 2,
      },
      {
        pregunta: '¿Qué tiene en el cuello?',
        opciones: ['Un collar blanco', 'Un parche iridiscente', 'Plumas rojas', 'Una cresta'],
        correcta: 1,
      },
      {
        pregunta: '¿Cómo suele andar?',
        opciones: ['En bandadas', 'Siempre sola', 'Solo de noche', 'Solo en parejas'],
        correcta: 0,
      },
    ],
  },
  {
    id: 'bichofue',
    nombre: 'Bichofué',
    cientifico: 'Pitangus sulphuratus',
    familia: 'Tyrannidae',
    ingles: 'Great Kiskadee',
    wikiaves: 'https://wikiaves.icesi.edu.co/birds/3368',
    descripcion:
      'Ave grande, llamativa y bullicosa, rechoncha, de cabeza grande y cola corta. ' +
      'Tiene el vientre amarillo y alas y cola marrones con bordes rojizos. ' +
      'Prefiere perchas visibles, cerca de zonas abiertas o de agua, y come peces, insectos, lagartijas y frutas.',
    lat: null, lng: null, radio: 25,
    canto: null,
    modelo: 'buho.glb', // PROVISIONAL
    quiz: [
      {
        pregunta: '¿De qué color es el vientre del bichofué?',
        opciones: ['Azul', 'Blanco', 'Amarillo', 'Rojo'],
        correcta: 2,
      },
      {
        pregunta: '¿Qué llamada fuerte se le escucha?',
        opciones: ['"kis-ki-di"', '"pop"', '"cuac"', '"cu-cu-rrú"'],
        correcta: 0,
      },
      {
        pregunta: '¿Qué come?',
        opciones: ['Solo semillas', 'Solo néctar', 'Una variedad de animales y plantas', 'Solo carroña'],
        correcta: 2,
      },
    ],
  },
  {
    id: 'azulejo',
    nombre: 'Azulejo Común',
    cientifico: 'Thraupis episcopus',
    familia: 'Thraupidae',
    ingles: 'Blue-gray Tanager',
    wikiaves: 'https://wikiaves.icesi.edu.co/birds/3767',
    descripcion:
      'Ave gris azulosa clara, común y de amplia distribución en campos abiertos con árboles grandes, pueblos y jardines. ' +
      'Tiene ojos oscuros y pico robusto. Se alimenta de frutas en la parte alta y media de los árboles ' +
      'y se percha en los cables de teléfono.',
    lat: null, lng: null, radio: 25,
    canto: null,
    modelo: 'buho.glb', // PROVISIONAL
    quiz: [
      {
        pregunta: '¿De qué color es el azulejo común?',
        opciones: ['Gris azulosa clara', 'Amarillo intenso', 'Rojo', 'Negro'],
        correcta: 0,
      },
      {
        pregunta: '¿De qué se alimenta principalmente?',
        opciones: ['Peces', 'Frutas', 'Lagartijas', 'Roedores'],
        correcta: 1,
      },
      {
        pregunta: '¿Dónde suele posarse?',
        opciones: ['En el suelo', 'Dentro de cuevas', 'En los cables de teléfono', 'Sobre el agua'],
        correcta: 2,
      },
    ],
  },
  {
    id: 'gavilan',
    nombre: 'Gavilán Pollero',
    cientifico: 'Rupornis magnirostris',
    familia: 'Accipitridae',
    ingles: 'Roadside Hawk',
    wikiaves: 'https://wikiaves.icesi.edu.co/birds/3506',
    descripcion:
      'Rapaz común al lado de los caminos en tierras bajas tropicales; suele verse en cables, postes y cercas. ' +
      'El adulto tiene ojos pálidos penetrantes y el pecho estriado, que contrasta con el vientre barrado. ' +
      'Vuela con aleteos rápidos y fuertes.',
    lat: null, lng: null, radio: 25,
    canto: null,
    modelo: 'buho.glb', // PROVISIONAL
    quiz: [
      {
        pregunta: '¿Dónde suele verse al gavilán pollero?',
        opciones: ['En cables, postes y cercas', 'Bajo tierra', 'Dentro del agua', 'Solo en el páramo'],
        correcta: 0,
      },
      {
        pregunta: '¿Cómo son los ojos del adulto?',
        opciones: ['Rojos', 'Pálidos y penetrantes', 'Completamente negros', 'Azules'],
        correcta: 1,
      },
      {
        pregunta: '¿Cómo es el pecho del adulto frente al vientre?',
        opciones: ['Ambos lisos', 'Pecho barrado y vientre estriado', 'Pecho estriado y vientre barrado', 'Ambos blancos'],
        correcta: 2,
      },
    ],
  },
]

export const avePorId = (id) => AVES.find((a) => a.id === id)