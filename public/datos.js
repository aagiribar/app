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

let datosElect = []
let datosGeo = [];
let datosCol = [];

let objetos = [];

let mapaEs, mapaCan;

let escena, camara, renderer;
let focoCamara;
let controlOrbital;

const gui = new GUI();
let elementosUI;
let selectorMapa;

let raycaster;

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

    raycaster = new THREE.Raycaster();
    document.addEventListener("click", onDocumentClick);

    controlOrbital = new OrbitControls(camara, renderer.domElement);

    mapaEs = Plano(0, 0, 0, "España");
    texturizarPlano(mapaEs, "mapa_es.png");

    mapaCan = Plano(-10, 0, 0, "Canarias");
    texturizarPlano(mapaCan, "mapa_can.png");

    focoCamara = mapaEs;

    elementosUI = {
        "Mapa seleccionado": "España"
    }

    selectorMapa = gui.add(elementosUI, "Mapa seleccionado", ["España", "Canarias"]);
    selectorMapa.onChange(
        function(valor) {
            if (valor == "España") {
                focoCamara = mapaEs;
            }
            else if (valor == "Canarias") {
                focoCamara = mapaCan;
            }
        }
    );
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

function Cubo(x, y, z, ancho, alto, profundidad, color) {
    let geometria = new THREE.BoxGeometry(ancho, alto, profundidad);
    let material = new THREE.MeshBasicMaterial({
        color: color
    });
    let mesh = new THREE.Mesh(geometria, material);

    mesh.position.set(x, y, z);
    escena.add(mesh);
    return mesh;
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
            let color = obtenerColor(datosEleccion.indice, i);
            let zNuevoCubo = zCuboAnterior + (profundidadAnterior / 2) + (profundidad / 2);
            let cubo = Cubo(coordenadasMapa[0], coordenadasMapa[1], zNuevoCubo, 0.15, 0.15, profundidad, color);
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

function onDocumentClick(event) {
    const mouse = {
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    };

    // Intersección, define rayo
    raycaster.setFromCamera(mouse, camara);

    const intersecciones = raycaster.intersectObjects([mapaEs, mapaCan]);
    if (intersecciones.length > 0) {
        focoCamara = intersecciones[0].object;
        selectorMapa.setValue(focoCamara.userData.nombre);
    }
}

function animationLoop() {
    requestAnimationFrame(animationLoop);
    
    // Se recoloca el foco de la camara orbital
    controlOrbital.target.x = focoCamara.position.x;
    controlOrbital.target.y = focoCamara.position.y;
    controlOrbital.target.z = focoCamara.position.z;
    controlOrbital.update();

    renderer.render(escena, camara);
}