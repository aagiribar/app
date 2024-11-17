import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// Latitud y longitud de los extremos del mapa de la imagen
let minLon_es = -10.24;
let maxLon_es = 5.03;
let minLat_es = 34.81;
let maxLat_es = 44.26;

let minLon_can = -18.402;
let maxLon_can = -13.310;
let minLat_can = 27.406;
let maxLat_can = 29.473;

// Array con parte de los nombres de los archivos de datos
const elecciones = ["1977", "1979", "1982", "1986", "1989", "1993", "1996", "2000", "2004", "2008", "2011", "2015", "2016", "04_2019", "11_2019", "2023"];
// Array con los textos que mostrar en el selector
const textosElecciones = ["Junio de 1977", "Marzo de 1979", "Octubre de 1982", "Junio de 1986", "Octubre de 1989", "Junio de 1993", "Marzo de 1996", "Marzo de 2000", "Marzo de 2004", "Marzo de 2008", "Noviembre de 2011", "Diciembre de 2015", "Junio de 2016", "Abril de 2019", "Noviembre de 2019", "Julio de 2023"]
// Array que contiene el valor y el indice del proceso electoral seleccionado
let eleccionActual;

// Array que contiene los datos electorales cargados desde los ficheros.
// Cada elemento del array es un objeto con la siguiente estructura
// indice: Índice del proceso electoral dentro de datosElect
// encabezados: Encabezado del fichero de datos
// resultados: Array que contiene 52 arrays con los resultados de cada provincia
// totales: Array con los resultados totales a nivel nacional
let datosElect = [];
// Array que contiene los datos geográficos de las 52 provincias de España
// Cada elemento es un objeto con la siguiente estructura
// nombre: Nombre de la provincia
// latitud: Latitud de la provincia
// longitud: Longitud de la provincia
let datosGeo = [];
// Array que contiene los datos de colores de los diferentes partidos
// Cada elemento del array es un array que contiene los colores en el mismo orden en los que aparecen en los ficheros correspondientes a cada elección
let datosCol = [];

// Array en el que se cargarán los nombres de las provincias
let nombresProvincias = [];
let provinciaActual = "Todas";

// Array en el que se almacenarán los cubos creados para representar los datos
// Contiene un array por cada elección y, a su vez, cada array contendrá un array por provincia en el que se almacenarán los cubos correspondientes a esa provincia
let objetos = [];

// Variable para almacenar el elemento de información mostrado actualmente
let infoActual;
// Array en el que se almacenan los elementos HTML creados para mostrar los resultados nacionales
let elementosInfoGeneral = [];
// Array en el que se almacenan los elementos HTML creados para mostrar los resultados locales
let elementosInfoProvincias = [];

// Planos que representan a los dos mapas
let mapaEs, mapaCan;

let escena, camara, renderer;
let focoCamara;
let controlOrbital;

// Creación de la interfaz de usuario
const gui = new GUI();
let elementosUI;
let selectorMapa, selectorEleccion, selectorProvincia;

// Elemento de información para mostrar en pantalla
let info;

// Se cargan los datos necesarios
await cargarDatos();
// Se inicializa la simulación
init();
// Se inicializa el bucle de animación
animationLoop();


function init() {
    // Elemento de información para visualizar los resultados
    info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.top = '30px';
    info.style.width = '100%';
    info.style.textAlign = 'left';
    info.style.color = '#fff';
    info.style.fontWeight = 'bold';
    info.style.backgroundColor = 'transparent';
    info.style.zIndex = '1';
    info.style.fontFamily = 'Monospace';
    info.innerHTML = "Resultados";
    document.body.appendChild(info);
    crearInfoResultadosGeneral();
    crearInfoResultadosProvincia();
    info.appendChild(elementosInfoGeneral[0]);
    infoActual = elementosInfoGeneral[0];

    // Creación de la escena
    escena = new THREE.Scene();
    
    // Creación de la camara
    camara = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )

    camara.position.z = 5;

    // Creación del renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Creación del control de tipo orbital
    controlOrbital = new OrbitControls(camara, renderer.domElement);

    // Creación y texturización del plano que representa al mapa de España
    mapaEs = Plano(0, 0, 0, "España");
    texturizarPlano(mapaEs, "mapa_es.png");

    // Creación y texturización del plano que representa al mapa de Canarias
    mapaCan = Plano(-10, 0, 0, "Canarias");
    texturizarPlano(mapaCan, "mapa_can.png");

    // Inicialización del punto sobre el que orbita la cámara al principio de la simulación
    focoCamara = [0, 0, 0];

    // Objeto que almacena los elementos de la interfaz de usuario
    elementosUI = {
        "Mapa seleccionado": "España",
        "Elección seleccionada": textosElecciones[0],
        "Provincia": "Todas"
    }

    // Selector de mapa sobre el que orbitará la cámara
    selectorMapa = gui.add(elementosUI, "Mapa seleccionado", ["España", "Canarias"]);
    selectorMapa.onChange(
        function(valor) {
            if (valor == "España") {
                focoCamara = [0, 0, 0];
            }
            else if (valor == "Canarias") {
                focoCamara = [-10, 0, 0];
            }
        }
    );

    // Selector de proceso electoral mostrado
    selectorEleccion = gui.add(elementosUI, "Elección seleccionada", textosElecciones);
    selectorEleccion.onChange(
        function(valor) {
            let indice = textosElecciones.findIndex((texto) => valor == texto);
            mostrarDatosEleccion(indice, provinciaActual);
            // Se modifica el elemento de información para mostrar los datos correspondientes al proceso electoral seleccionado
            info.removeChild(infoActual);
            eleccionActual = [elecciones[indice], indice];
            if (provinciaActual == "Todas") {
                infoActual = elementosInfoGeneral[eleccionActual[1]];
                info.appendChild(infoActual);
            }
            else {
                let indice = elementosInfoProvincias[eleccionActual[1]].findIndex((elemento) => elemento.id == provinciaActual);
                infoActual = elementosInfoProvincias[eleccionActual[1]][indice];
                info.appendChild(infoActual);
            }
        }
    );

    // Selector de provincia
    nombresProvincias = obtenerNombresProvincias();
    nombresProvincias.push("Todas");

    selectorProvincia = gui.add(elementosUI, "Provincia", nombresProvincias);
    selectorProvincia.onChange(
        function(valor) {
            info.removeChild(infoActual);
            mostrarDatosEleccion(eleccionActual[1], valor);
            provinciaActual = valor;

            // Añade el elemento de información correspondiente y cambia el foco de la cámara
            if(valor == "Todas") {
                selectorMapa.show();
                focoCamara = [0, 0, 0];
                selectorMapa.setValue("España");
                infoActual = elementosInfoGeneral[eleccionActual[1]];
                info.appendChild(infoActual);
            }
            else {
                selectorMapa.hide();
                let coordenadas = obtenerCoordenadasMapa(obtenerCoordenadas(valor));
                focoCamara = [coordenadas[0], coordenadas[1], 0];
                let indice = elementosInfoProvincias[eleccionActual[1]].findIndex((elemento) => elemento.id == valor);
                infoActual = elementosInfoProvincias[eleccionActual[1]][indice];
                info.appendChild(infoActual);
            }
        }
    )

    // Se dibujan sin mostrar los resultados en los mapas
    for (let i = 0; i < elecciones.length; i++) {
        objetos.push(dibujarDatosEleccion(datosElect[i]));
    }
    // Se muestran los resultados del primer proceso electoral
    mostrarDatosEleccion(0, "Todas");
    eleccionActual = [elecciones[0], 0];
}

// Función que carga los datos necesarios para la ejecución de la simulación
async function cargarDatos() {
    for (let i = 0; i < elecciones.length; i++) {
        await fetch(elecciones[i] + ".csv")
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error("Error: " + respuesta.statusText);
            }
            return respuesta.text();
        })
        .then(contenido => {
            procesarDatosElect(contenido, i);
            console.log("Fichero " + elecciones[i] + ".csv cargado");
        })
        .catch(error => {
            console.error("Error al cargar el archivo", error);
        });

        await fetch("colores_" + elecciones[i] + ".csv")
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error("Error: " + respuesta.statusText);
            }
            return respuesta.text();
        })
        .then(contenido => {
            procesarDatosColores(contenido);
            console.log("Fichero colores_" + elecciones[i] + ".csv cargado");
        })
        .catch(error => {
            console.error("Error al cargar el archivo", error);
        });
    }

    await fetch("datos_geo.csv")
    .then(respuesta => {
        if (!respuesta.ok) {
            throw new Error("Error: " + respuesta.statusText);
        }
        return respuesta.text();
    })
    .then(contenido => {
        procesarDatosGeo(contenido);
    })
    .catch(error => {
        console.error("Error al cargar el archivo", error);
    });
}

// Función que carga los datos electorales de los diferentes procesos
function procesarDatosElect(contenido, indice) {
    const sep = ";";
    const filas = contenido.split("\n");

    const encabezados = filas[0].split(sep);

    let resultados = [];
    let totales = filas.pop();

    for (let i = 1; i < filas.length; i++) {
        const columna = filas[i].split(sep);
        if (columna.length > 1) {
            resultados.push(columna);
        }
    }

    datosElect.push({
        indice: indice,
        encabezados: encabezados,
        resultados: resultados,
        totales: totales.split(sep)
    });
}

// Función que carga los datos geográficos de las diferentes provincias
function procesarDatosGeo(contenido) {
    const sep = ";";
    const filas = contenido.split("\n");

    const encabezados = filas[0].split(sep);

    const indices = {
        nombre: encabezados.indexOf("Provincia"),
        latitud: encabezados.indexOf("Latitud"),
        longitud: encabezados.indexOf("Longitud")
    }

    for (let i = 1; i < filas.length; i++) {
        const columna = filas[i].split(sep);
        if(columna.length > 1) {
            datosGeo.push({
                nombre: columna[indices.nombre],
                latitud: columna[indices.latitud],
                longitud: columna[indices.longitud]
            })
        }
    }

    console.log("Archivo con datos grográficos cargado");
}

// Función que carga los datos de colores de los diferentes partidos a efectos de visualización
function procesarDatosColores(contenido) {
    const sep = ";";
    const filas = contenido.split("\n");

    const encabezados = filas[0].split(sep);

    let colores = [];
    for (let i = 1; i < filas.length; i++) {
        const columna = filas[i].split(sep);
        if (columna.length > 1) {
            colores.push(columna[1]);
        }
    }

    datosCol.push(colores);
}

// Función que crear un plano
// x, y, z: Posición del plano
// nombre: Nombre que almacenar como información del plano
function Plano(x, y, z, nombre = undefined) {
    let geometria = new THREE.PlaneBufferGeometry(5, 5);
    let material = new THREE.MeshBasicMaterial({});
    let mesh = new THREE.Mesh(geometria, material);
    
    mesh.position.set(x, y, z);
    mesh.userData.mapsX = 5;
    mesh.userData.mapsY = 5;
    if (nombre != undefined) {
        mesh.userData.nombre = nombre;
    }
    escena.add(mesh);
    return mesh;
}

// Función para crear un cubo
// x,y,z: Posición del cubo
// ancho, alto, profundidad: Dimensiones del cubo
// color: Color del cubo
// nombre: Nombre que almacenar como información del cubo
function Cubo(x, y, z, ancho, alto, profundidad, color, nombre = undefined) {
    let geometria = new THREE.BoxGeometry(ancho, alto, profundidad);
    let material = new THREE.MeshBasicMaterial({
        color: color
    });
    let mesh = new THREE.Mesh(geometria, material);

    mesh.position.set(x, y, z);
    mesh.visible = false;
    if (nombre != undefined) {
        mesh.userData.nombre = nombre;
    }
    escena.add(mesh);
    return mesh;
}

// Función que mustra los datos de un proceso electoral y una provincia
// indiceEleccion: Índice en el array en el que se almacenan los datos electores
// provincia: Provincia que se desea visualizar. Si es "Todas" se visualizan todas
function mostrarDatosEleccion(indiceEleccion, provincia) {
    let cubosEleccion, cubosProvincia;

    if(eleccionActual != undefined) {
        cubosEleccion = objetos[eleccionActual[1]];
        for (let i = 0; i < cubosEleccion.length; i++) {
            cubosProvincia = cubosEleccion[i];
            for (let j = 0; j < cubosProvincia.length; j++) {
                cubosProvincia[j].visible = false;
            }
        }
    }
    
    cubosEleccion = objetos[indiceEleccion];
    for (let i = 0; i < cubosEleccion.length; i++) {
        cubosProvincia = cubosEleccion[i];
        for (let j = 0; j < cubosProvincia.length; j++) {
            if (provincia == "Todas" || cubosProvincia[j].userData.nombre == provincia) {
                cubosProvincia[j].visible = true;
            }
        }
    }
}

// Función que crea los diferentes cubos para la representación
// Estos cubos se crean y se añaden a la escena pero no son visibles en un principio
// datosEleccion: Objeto con los datos electorales
function dibujarDatosEleccion(datosEleccion) {
    let cubosEleccion = [];
    for (let i = 0; i < datosEleccion.resultados.length; i++) {
        cubosEleccion.push(dibujarDatosProvincia(datosEleccion, i));
    }
    return cubosEleccion;
}

// Función que crea los cubos de una provincia concreta
// datosEleccion: Objeto con los datos electorales
// indiceProvincia: Índice que representa a una provincia en el array de resultados
function dibujarDatosProvincia(datosEleccion, indiceProvincia) {
    let datosProvincia = datosEleccion.resultados[indiceProvincia];
    const coordenadas = obtenerCoordenadas(datosProvincia[0]);

    let cubos = [];
    const resultados = datosEleccion.resultados[indiceProvincia];

    let profundidadAnterior = 0;
    let zCuboAnterior = 0;
    for (let i = 1; i < resultados.length; i++) {
        const diputados = parseInt(resultados[i]);
        if (diputados > 0) {
            let coordenadasMapa = obtenerCoordenadasMapa(coordenadas);
            let profundidad = diputados * 0.03;
            let color = obtenerColor(datosEleccion.indice, i - 1);
            let zNuevoCubo = zCuboAnterior + (profundidadAnterior / 2) + (profundidad / 2);
            let cubo = Cubo(coordenadasMapa[0], coordenadasMapa[1], zNuevoCubo, 0.15, 0.15, profundidad, color, resultados[0]);
            cubos.push(cubo);
            profundidadAnterior = profundidad;
            zCuboAnterior = zNuevoCubo;
        }
    }
    return cubos;
}

// Función para obtener las coordenadas de una provincia de los datos geográficos
// provincia: Nombre de la provincia
function obtenerCoordenadas(provincia) {
    let provinciaEncontrada = datosGeo.find((valor) => valor.nombre == provincia);
    return [parseFloat(provinciaEncontrada.longitud), parseFloat(provinciaEncontrada.latitud)];
}

// Función que transforma las coordenadas reales a las coordenadas de los mapas creados
// coordenadas: Array con las coordenadas [longitud, latitud]
function obtenerCoordenadasMapa(coordenadas) {
    let longitud, latitud;
    if (coordenadas[1] < 30) {
        // Si la latitud es inferior a 30 se mapea con respecto al mapa de las Islas Canarias
        longitud = (mapeo(coordenadas[0], minLon_can, maxLon_can, -mapaCan.userData.mapsX / 2, mapaCan.userData.mapsX / 2)) - 10;
        latitud = mapeo(coordenadas[1], minLat_can, maxLat_can, -mapaCan.userData.mapsY / 2, mapaCan.userData.mapsY);
    }
    else {
        longitud = mapeo(coordenadas[0], minLon_es, maxLon_es, -(mapaEs.userData.mapsX / 2), mapaEs.userData.mapsX / 2);
        latitud = mapeo(coordenadas[1], minLat_es, maxLat_es, -(mapaEs.userData.mapsY / 2), mapaEs.userData.mapsY / 2);
    }
    return [longitud, latitud];
}

// Función que obtiene el color de un partido de los datos de colores
// indiceEleccion: Índice de la elección actual en el array de datos electorales
// indicePartido: Índice del partido en los datos
// numero: Si se desea que el valor se devuelva como número o como String
function obtenerColor(indiceEleccion, indicePartido, numero = true) {
    if (numero) {
        return parseInt(datosCol[indiceEleccion][indicePartido]);
    }
    else {
        return "#" + datosCol[indiceEleccion][indicePartido].substring(2);
    }
}

// Función que aplica una textura a un plano
// plano: Plano que se va a texturizar
// textuta: URL de la textura
function texturizarPlano(plano, textura) {
    new THREE.TextureLoader().load(
        textura,
        function(textura) {
            plano.material.map = textura;
            plano.material.needsUpdate = true;

            const txHeight = textura.image.height;
            const txWidth = textura.image.width;

            if (txHeight > txWidth) {
                let factor = txHeight / txWidth;
                plano.scale.set(1, factor, 1);
                plano.userData.mapsY *= factor;
            }
            else {
                let factor = txWidth / txHeight;
                plano.scale.set(factor, 1, 1);
                plano.userData.mapsX *= factor;
            }
        }
    )
}

// Función que mapea una coordenada a los mapas
function mapeo(val, vmin, vmax, dmin, dmax) {
    //Normaliza valor en el rango de partida, t=0 en vmin, t=1 en vmax
    let t = 1 - (vmax - val) / (vmax - vmin);
    return dmin + t * (dmax - dmin);
}

// Función que devuelve un array con los nombres de las provincias
function obtenerNombresProvincias() {
    let nombres = [];

    for (let i = 0; i < datosGeo.length; i++) {
        nombres.push(datosGeo[i].nombre);
    }

    return nombres;
}

// Función que crea los elementos de información con los resultados nacionales (cuando se selecciona la provincia "Todas")
function crearInfoResultadosGeneral() {
    for (let i = 0; i < elecciones.length; i++) {
        let totales = datosElect[i].totales;
        let encabezados = datosElect[i].encabezados;
        let elemento = document.createElement("div");

        elemento.innerHTML = "Resultados Generales - Elecciones de " + textosElecciones[i];
        for (let j = 1; j < totales.length; j++) {
            let infoPartido = document.createElement("div");
            let nombrePartido = document.createElement("span");
            nombrePartido.innerHTML = encabezados[j];
            nombrePartido.style.color = obtenerColor(i, j - 1, false);
            infoPartido.appendChild(nombrePartido);
            let diputadosPartido = document.createElement("span");
            diputadosPartido.innerHTML = " - " + totales[j];
            infoPartido.appendChild(diputadosPartido);
            elemento.appendChild(infoPartido);
        }
        elementosInfoGeneral.push(elemento);
    }
}

// Función que crea los elementos de información con los resultados provinciales (cuando se selecciona una provincia)
function crearInfoResultadosProvincia() {
    let elementosInfo = [];
    for (let i = 0; i < elecciones.length; i++) {
        let resultados = datosElect[i].resultados;
        let encabezados = datosElect[i].encabezados;
        let elementosInfoActual = [];

        for (let j = 0; j < resultados.length; j++) {
            let elemento = document.createElement("div");
            elemento.id = resultados[j][0];
            elemento.innerHTML = "Resultados de la provincia de " + elemento.id + " - Elecciones de " + textosElecciones[i];
            
            for (let k = 1; k < resultados[j].length; k++) {
                if(resultados[j][k] != 0) {
                    let infoPartido = document.createElement("div");
                    let nombrePartido = document.createElement("span");
                    nombrePartido.innerHTML = encabezados[k];
                    nombrePartido.style.color = obtenerColor(i, k - 1, false);
                    infoPartido.appendChild(nombrePartido);
                    let diputadosPartido = document.createElement("span");
                    diputadosPartido.innerHTML = " - " + resultados[j][k];
                    infoPartido.appendChild(diputadosPartido);
                    elemento.appendChild(infoPartido);
                }
            }
            elementosInfoActual.push(elemento);
        }
        elementosInfo.push(elementosInfoActual);
    }
    elementosInfoProvincias = elementosInfo;
}

function animationLoop() {
    requestAnimationFrame(animationLoop);
    
    // Se recoloca el foco de la camara orbital
    controlOrbital.target.x = focoCamara[0];
    controlOrbital.target.y = focoCamara[1];
    controlOrbital.target.z = focoCamara[2];
    controlOrbital.update();

    // Se renderiza la escena
    renderer.render(escena, camara);
}