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