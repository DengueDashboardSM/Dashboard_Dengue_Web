// ============================================================
// DESCARGAS EXCEL
// ============================================================

// ============================================================
// OBTENER DATOS SEGÚN LOS FILTROS ACTUALES
// ============================================================

function obtenerDatosParaDescarga() {

    aplicarFiltros();

    return Array.isArray(datosFiltrados)
        ? [...datosFiltrados]
        : [];

}


// ============================================================
// CARGAR LIBRERÍA EXCEL
// ============================================================

function asegurarExcel(callback) {

    // Si XLSX ya está cargado
    if (typeof XLSX !== "undefined") {

        callback();

        return;
    }


    // Evitar cargar la librería dos veces
    const scriptExistente =
        document.querySelector(
            'script[data-xlsx="true"]'
        );

    if (scriptExistente) {

        scriptExistente.addEventListener(
            "load",
            function () {

                if (typeof XLSX !== "undefined") {
                    callback();
                } else {
                    alert(
                        "No se pudo activar la herramienta de Excel."
                    );
                }

            }
        );

        return;
    }


    const script =
        document.createElement("script");


    script.src =
        "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";


    script.setAttribute(
        "data-xlsx",
        "true"
    );


    script.onload = function () {

        if (
            typeof XLSX !== "undefined"
        ) {

            callback();

        } else {

            alert(
                "No se pudo activar la herramienta de Excel."
            );

        }

    };


    script.onerror = function () {

        alert(
            "No se pudo cargar la herramienta de Excel."
        );

    };


    document.head.appendChild(
        script
    );

}


// ============================================================
// GENERAR EXCEL
// ============================================================

function descargarExcelSeguro(
    datos,
    nombreArchivo
) {

    if (
        !Array.isArray(datos) ||
        datos.length === 0
    ) {

        alert(
            "No hay datos para descargar con los filtros actuales."
        );

        return;
    }


    asegurarExcel(
        function () {

            try {

                const hoja =
                    XLSX.utils.json_to_sheet(
                        datos
                    );


                // Ancho automático de columnas
                const columnas =
                    Object.keys(
                        datos[0]
                    );


                hoja["!cols"] =
                    columnas.map(
                        function (columna) {

                            let ancho =
                                columna.length;

                            datos.forEach(
                                function (fila) {

                                    const valor =
                                        fila[columna] == null
                                            ? ""
                                            : String(
                                                fila[columna]
                                            );

                                    if (
                                        valor.length > ancho
                                    ) {

                                        ancho =
                                            valor.length;
                                    }

                                }
                            );

                            return {
                                wch:
                                    Math.min(
                                        Math.max(
                                            ancho + 2,
                                            12
                                        ),
                                        45
                                    )
                            };

                        }
                    );


                const libro =
                    XLSX.utils.book_new();


                XLSX.utils.book_append_sheet(
                    libro,
                    hoja,
                    "Datos"
                );


                XLSX.writeFile(
                    libro,
                    nombreArchivo + ".xlsx"
                );


            } catch (error) {

                console.error(
                    "Error al generar Excel:",
                    error
                );


                alert(
                    "Ocurrió un error al generar el archivo Excel."
                );

            }

        }
    );

}


// ============================================================
// EXCEL 1
// DETALLES POR LOCALIDAD
// ============================================================

function descargarDetallesLocalidad() {

    const datosActuales =
        obtenerDatosParaDescarga();


    if (
        datosActuales.length === 0
    ) {

        alert(
            "No hay datos para descargar con los filtros actuales."
        );

        return;
    }


    const resumen = {};


    datosActuales.forEach(
        function (fila) {

            const localidad =
                texto(
                    fila.localidad_eess
                ) ||
                "Sin localidad";


            if (
                !resumen[localidad]
            ) {

                resumen[localidad] = {

                    "Localidad":
                        localidad,

                    "Total de registros":
                        0,

                    "Viviendas inspeccionadas":
                        0,

                    "Viviendas cerradas":
                        0,

                    "Viviendas renuentes":
                        0,

                    "Viviendas deshabitadas":
                        0,

                    "Viviendas recuperadas":
                        0

                };

            }


            resumen[localidad]
                ["Total de registros"]++;


            if (
                inspeccionada(fila)
            ) {

                resumen[localidad]
                    ["Viviendas inspeccionadas"]++;

            }


            if (
                cerrada(fila)
            ) {

                resumen[localidad]
                    ["Viviendas cerradas"]++;

            }


            if (
                renuente(fila)
            ) {

                resumen[localidad]
                    ["Viviendas renuentes"]++;

            }


            if (
                deshabitada(fila)
            ) {

                resumen[localidad]
                    ["Viviendas deshabitadas"]++;

            }


            if (
                recuperada(fila)
            ) {

                resumen[localidad]
                    ["Viviendas recuperadas"]++;

            }

        }
    );


    descargarExcelSeguro(
        Object.values(resumen),
        "Detalles_por_localidad"
    );

}


// ============================================================
// EXCEL 2
// VIVIENDAS POR INSPECTOR
// ============================================================

function descargarViviendasInspector() {

    const datosActuales =
        obtenerDatosParaDescarga();


    if (
        datosActuales.length === 0
    ) {

        alert(
            "No hay datos para descargar con los filtros actuales."
        );

        return;
    }


    const resultado =
        datosActuales.map(
            function (fila) {

                let estado =
                    "INSPECCIONADA";


                if (
                    cerrada(fila)
                ) {

                    estado =
                        "CERRADA";

                }
                else if (
                    renuente(fila)
                ) {

                    estado =
                        "RENUENTE";

                }
                else if (
                    deshabitada(fila)
                ) {

                    estado =
                        "DESHABITADA";

                }
                else if (
                    recuperada(fila)
                ) {

                    estado =
                        "RECUPERADA";

                }


                return {

                    "Inspector":
                        texto(
                            fila.nombre_inspector
                        ),

                    "Estado":
                        estado,

                    "Fecha de inspección":
                        texto(
                            fila.fecha_inspeccion
                        ),

                    "Localidad":
                        texto(
                            fila.localidad_eess
                        ),

                    "Sector":
                        texto(
                            fila.sector
                        ),

                    "Código de manzana":
                        texto(
                            fila.codigo_manzana
                        ),

                    "Dirección":
                        texto(
                            fila.direccion
                        ),

                    "Persona que atiende":
                        texto(
                            fila.persona_atiende
                        ),

                    "Número de residentes":
                        texto(
                            fila.numero_residentes
                        ),

                    "Tipo de inspección":
                        texto(
                            fila.tipoActividadInspeccion
                        ),

                    "Hora de ingreso":
                        texto(
                            fila.hora_ingreso
                        ),

                    "Hora de salida":
                        texto(
                            fila.hora_salida
                        )

                };

            }
        );


    descargarExcelSeguro(
        resultado,
        "Viviendas_por_inspector"
    );

}


// ============================================================
// EXCEL 3
// DIRECCIONES
// ============================================================

function descargarDirecciones() {

    const datosActuales =
        obtenerDatosParaDescarga();


    if (
        datosActuales.length === 0
    ) {

        alert(
            "No hay direcciones con los filtros actuales."
        );

        return;
    }


    const resultado =
        datosActuales.map(
            function (fila) {

                let estado =
                    "INSPECCIONADA";


                if (
                    cerrada(fila)
                ) {

                    estado =
                        "CERRADA";

                }
                else if (
                    renuente(fila)
                ) {

                    estado =
                        "RENUENTE";

                }
                else if (
                    deshabitada(fila)
                ) {

                    estado =
                        "DESHABITADA";

                }
                else if (
                    recuperada(fila)
                ) {

                    estado =
                        "RECUPERADA";

                }


                return {

                    "Estado":
                        estado,

                    "Localidad":
                        texto(
                            fila.localidad_eess
                        ),

                    "Dirección":
                        texto(
                            fila.direccion
                        ),

                    "Código de manzana":
                        texto(
                            fila.codigo_manzana
                        ),

                    "Inspector":
                        texto(
                            fila.nombre_inspector
                        ),

                    "Fecha de inspección":
                        texto(
                            fila.fecha_inspeccion
                        ),

                    "Tipo de inspección":
                        texto(
                            fila.tipoActividadInspeccion
                        ),

                    "Sector":
                        texto(
                            fila.sector
                        ),

                    "Persona que atiende":
                        texto(
                            fila.persona_atiende
                        ),

                    "Número de residentes":
                        texto(
                            fila.numero_residentes
                        ),

                    "Hora de ingreso":
                        texto(
                            fila.hora_ingreso
                        ),

                    "Hora de salida":
                        texto(
                            fila.hora_salida
                        )

                };

            }
        );


    descargarExcelSeguro(
        resultado,
        "Direcciones_filtradas"
    );

}


// ============================================================
// CONECTAR LOS 3 BOTONES
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const botonLocalidad =
            document.getElementById(
                "btnExcelLocalidad"
            );


        const botonInspector =
            document.getElementById(
                "btnExcelInspector"
            );


        const botonDirecciones =
            document.getElementById(
                "btnExcelDirecciones"
            );


        if (
            botonLocalidad
        ) {

            botonLocalidad.onclick =
                descargarDetallesLocalidad;

        }


        if (
            botonInspector
        ) {

            botonInspector.onclick =
                descargarViviendasInspector;

        }


        if (
            botonDirecciones
        ) {

            botonDirecciones.onclick =
                descargarDirecciones;

        }

    }
);


// ============================================================
// CONSOLA
// ============================================================

console.log(
    "Dashboard Dengue cargado correctamente."
);