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