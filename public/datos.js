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

let datosParo = []

let mapaEs, mapaCan;

let escena, camara, renderer;
let focoCamara;
let controlOrbital;

const gui = new GUI();
let elementosUI;

init();
animationLoop();

function init() {
    fetch("datos_paro.csv")
    .then(respuesta => {
        if (!respuesta.ok) {
            throw new Error("Error: " + respuesta.statusText);
        }
        return respuesta.text();
    })
    .then(contenido => {
        procesarDatosParo(contenido);
    })
    .catch(error => {
        console.error("Error al cargar el archivo", error);
    });

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

    mapaEs = Plano(0, 0, 0);
    texturizarPlano(mapaEs, "mapa_es.png");

    mapaCan = Plano(-10, 0, 0);
    texturizarPlano(mapaCan, "mapa_can.png");

    focoCamara = mapaEs;

    elementosUI = {
        "Mapa seleccionado": "España"
    }

    gui.add(elementosUI, "Mapa seleccionado", ["España", "Canarias"]).onChange(
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


function procesarDatosParo(contenido) {
    const sep = ";";
    const filas = contenido.split("\n");
    
    const encabezados = filas[0].split(sep);

    const indices = {
        sexo: encabezados.indexOf("Sexo"),
        provincia: encabezados.indexOf("Provincias"),
        periodo: encabezados.indexOf("Periodo"),
        total: encabezados.indexOf("Total\r")
    }

    for (let i = 1; i < filas.length; i++) {
        const columna = filas[i].split(sep);
        if (columna.length > 1) {
            datosParo.push({
                sexo: columna[indices.sexo],
                provincia: columna[indices.provincia],
                periodo: columna[indices.periodo],
                total: columna[indices.total]
            })
        }
    }

    console.log("Archivo con datos de paro cargado");
}

function Plano(x, y, z) {
    let geometria = new THREE.PlaneBufferGeometry(5, 5);
    let material = new THREE.MeshBasicMaterial({});
    let mesh = new THREE.Mesh(geometria, material);
    
    mesh.position.set(x, y, z);
    mesh.userData.mapsX = 5;
    mesh.userData.mapsY = 5;
    escena.add(mesh);
    return mesh;
}

function texturizarPlano(plano, textura) {
    new THREE.TextureLoader().load(
        textura,
        function(textura) {
            plano.material.map = textura;
            plano.material.needsUpdate = true;

            const txHeight = textura.image.height;
            const txWidth = textura.image.width;

            if (txHeight > txWidth) {m
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

function animationLoop() {
    requestAnimationFrame(animationLoop);
    
    // Se recoloca el foco de la camara orbital
    controlOrbital.target.x = focoCamara.position.x;
    controlOrbital.target.y = focoCamara.position.y;
    controlOrbital.target.z = focoCamara.position.z;
    controlOrbital.update();

    renderer.render(escena, camara);
}