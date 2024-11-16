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

const elecciones = ["2015", "2016", "04_2019", "11_2019", "2023"];
const textosElecciones = ["Diciembre de 2015", "Junio de 2016", "Abril de 2019", "Noviembre de 2019", "Julio de 2023"]
let eleccionActual;

let datosElect = []
let datosGeo = [];
let datosCol = [];

let nombresProvincias = [];
let provinciaActual = "Todas";

let objetos = [];

let mapaEs, mapaCan;

let escena, camara, renderer;
let focoCamara;
let controlOrbital;

const gui = new GUI();
let elementosUI;
let selectorMapa, selectorEleccion, selectorProvincia;

await cargarDatos();
init();
animationLoop();

function init() {
    escena = new THREE.Scene();

    camara = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )

    camara.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controlOrbital = new OrbitControls(camara, renderer.domElement);

    mapaEs = Plano(0, 0, 0, "España");
    texturizarPlano(mapaEs, "mapa_es.png");

    mapaCan = Plano(-10, 0, 0, "Canarias");
    texturizarPlano(mapaCan, "mapa_can.png");

    focoCamara = [0, 0, 0];

    elementosUI = {
        "Mapa seleccionado": "España",
        "Elección seleccionada": "Diciembre de 2015",
        "Provincia": "Todas"
    }

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

    selectorEleccion = gui.add(elementosUI, "Elección seleccionada", textosElecciones);
    selectorEleccion.onChange(
        function(valor) {
            let indice = textosElecciones.findIndex((texto) => valor == texto);
            mostrarDatosEleccion(indice, provinciaActual);
            eleccionActual = [elecciones[indice], indice];
        }
    );

    nombresProvincias = obtenerNombresProvincias();
    nombresProvincias.push("Todas");

    selectorProvincia = gui.add(elementosUI, "Provincia", nombresProvincias);
    selectorProvincia.onChange(
        function(valor) {
            mostrarDatosEleccion(eleccionActual[1], valor);
            provinciaActual = valor;

            if(valor == "Todas") {
                selectorMapa.show();
                focoCamara = [0, 0, 0];
                selectorMapa.setValue("España");
            }
            else {
                selectorMapa.hide();
                let coordenadas = obtenerCoordenadasMapa(obtenerCoordenadas(valor));
                focoCamara = [coordenadas[0], coordenadas[1], 0];
            }
        }
    )

    for (let i = 0; i < elecciones.length; i++) {
        objetos.push(dibujarDatosEleccion(datosElect[i]));
    }
    mostrarDatosEleccion(0, "Todas");
    eleccionActual = ["2015", 0];
}

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

function procesarDatosElect(contenido, indice) {
    const sep = ";";
    const filas = contenido.split("\n");

    const encabezados = filas[0].split(sep);

    let resultados = [];

    for (let i = 1; i < filas.length; i++) {
        const columna = filas[i].split(sep);
        if (columna.length > 1) {
            resultados.push(columna);
        }
    }

    datosElect.push({
        indice: indice,
        encabezados: encabezados,
        resultados: resultados
    });
}

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

function dibujarDatosEleccion(datosEleccion) {
    let cubosEleccion = [];
    for (let i = 0; i < datosEleccion.resultados.length; i++) {
        cubosEleccion.push(dibujarDatosProvincia(datosEleccion, i));
    }
    return cubosEleccion;
}

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

function obtenerCoordenadas(provincia) {
    let provinciaEncontrada = datosGeo.find((valor) => valor.nombre == provincia);
    return [parseFloat(provinciaEncontrada.longitud), parseFloat(provinciaEncontrada.latitud)];
}

function obtenerCoordenadasMapa(coordenadas) {
    let longitud, latitud;
    if (coordenadas[1] < 30) {
        longitud = (mapeo(coordenadas[0], minLon_can, maxLon_can, -mapaCan.userData.mapsX / 2, mapaCan.userData.mapsX / 2)) - 10;
        latitud = mapeo(coordenadas[1], minLat_can, maxLat_can, -mapaCan.userData.mapsY / 2, mapaCan.userData.mapsY);
    }
    else {
        longitud = mapeo(coordenadas[0], minLon_es, maxLon_es, -(mapaEs.userData.mapsX / 2), mapaEs.userData.mapsX / 2);
        latitud = mapeo(coordenadas[1], minLat_es, maxLat_es, -(mapaEs.userData.mapsY / 2), mapaEs.userData.mapsY / 2);
    }
    return [longitud, latitud];
}

function obtenerColor(indiceEleccion, indicePartido) {
    return parseInt(datosCol[indiceEleccion][indicePartido]);
}

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

//valor, rango origen, rango destino
function mapeo(val, vmin, vmax, dmin, dmax) {
    //Normaliza valor en el rango de partida, t=0 en vmin, t=1 en vmax
    let t = 1 - (vmax - val) / (vmax - vmin);
    return dmin + t * (dmax - dmin);
}

function obtenerNombresProvincias() {
    let nombres = [];

    for (let i = 0; i < datosGeo.length; i++) {
        nombres.push(datosGeo[i].nombre);
    }

    return nombres;
}

function animationLoop() {
    requestAnimationFrame(animationLoop);
    
    // Se recoloca el foco de la camara orbital
    controlOrbital.target.x = focoCamara[0];
    controlOrbital.target.y = focoCamara[1];
    controlOrbital.target.z = focoCamara[2];
    controlOrbital.update();

    renderer.render(escena, camara);
}