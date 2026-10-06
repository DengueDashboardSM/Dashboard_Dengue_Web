// ============================================================
// DASHBOARD DE INSPECCIONES Y CONTROL DE DENGUE (CORREGIDO)
// CONEXIÓN REAL: datos.csv
// ============================================================

let datosOriginales = [];
let datosFiltrados = [];
let charts = {};
let mapa = null;
let marcadores = [];
const ARCHIVO_CSV = "datos.csv";
let busquedaInspector = "";

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// ------------------------------------------------------------
// ARRANQUE (funciona aunque el script cargue tarde)
// ------------------------------------------------------------
function iniciar() {
    fijarTextoFecha("Cargando...", "Datos Reales y Registrados");
    configurarBuscadorSugerencias();
    configurarBotones();
    cargarDatosCSV();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
} else {
    iniciar();
}

function cargarDatosCSV() {
    Papa.parse(ARCHIVO_CSV, {
        download: true,
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: function (resultado) {
            console.log("CSV cargado:", resultado.data.length, "registros");
            procesarDatos(resultado.data);
        },
        error: function (error) {
            console.error("Error cargando CSV:", error);
            fijarTextoFecha("Sin datos", "No se pudo cargar datos.csv");
            alert("No se pudo cargar datos.csv");
        }
    });
}

// Ejecuta cada paso por separado: si uno falla, los demás siguen
function seguro(nombre, fn) {
    try {
        fn();
    } catch (e) {
        console.error("Error en " + nombre + ":", e);
    }
}

function procesarDatos(datos) {
    datosOriginales = datos.filter(fila => fila && Object.keys(fila).length > 1);
    datosFiltrados = [...datosOriginales];

    console.log("DATOS REALES:", datosOriginales.length);

    // La fecha va PRIMERO para que nunca se quede en "Cargando..."
    seguro("actualizarFecha", actualizarFecha);
    seguro("inicializarFiltros", inicializarFiltros);
    seguro("inicializarMapa", inicializarMapa);
    seguro("actualizarDashboard", actualizarDashboard);
}

// ------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------
function texto(valor) {
    if (valor === undefined || valor === null) return "";
    return String(valor).trim();
}

function numero(valor) {
    if (valor === undefined || valor === null || valor === "") return 0;
    const n = parseFloat(String(valor).replace(",", ".").trim());
    return isNaN(n) ? 0 : n;
}

function setTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function fmt(n) {
    return Number(n || 0).toLocaleString("es-PE");
}

function inspeccionada(f) { return texto(f.atencion_vivienda_indicador) === "1"; }
function cerrada(f)       { return texto(f.atencion_vivienda_indicador) === "2"; }
function renuente(f)      { return texto(f.atencion_vivienda_indicador) === "3"; }
function deshabitada(f)   { return texto(f.atencion_vivienda_indicador) === "4"; }
function recuperada(f)    { return texto(f.recuperacion_vivienda_indicador_ini) !== ""; }

function estadoVivienda(f) {
    if (cerrada(f)) return "CERRADA";
    if (renuente(f)) return "RENUENTE";
    if (deshabitada(f)) return "DESHABITADA";
    if (recuperada(f)) return "RECUPERADA";
    return "INSPECCIONADA";
}

// Acepta: dd/mm/yyyy, d/m/yyyy, yyyy-mm-dd, con o sin hora
function obtenerFecha(valor) {
    valor = texto(valor);
    if (!valor) return null;

    let fecha = null;
    let m;

    if ((m = valor.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/))) {
        fecha = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    } else if ((m = valor.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/))) {
        fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    } else {
        fecha = new Date(valor);
    }

    return fecha && !isNaN(fecha.getTime()) ? fecha : null;
}

function fijarTextoFecha(principal, secundario) {
    setTexto("fechaActualizacion", principal);
    setTexto("horaActualizacion", secundario);
}

function actualizarFecha() {
    const fechas = datosOriginales
        .map(f => obtenerFecha(f.fecha_inspeccion))
        .filter(Boolean);

    if (fechas.length === 0) {
        fijarTextoFecha("Sin fecha", "Datos Reales y Registrados");
        return;
    }

    let max = fechas[0].getTime();
    fechas.forEach(f => { if (f.getTime() > max) max = f.getTime(); });

    const u = new Date(max);
    const dia = String(u.getDate()).padStart(2, "0");
    const mes = String(u.getMonth() + 1).padStart(2, "0");

    fijarTextoFecha(`${dia}/${mes}/${u.getFullYear()}`, "Datos Reales y Registrados");
}

// ------------------------------------------------------------
// FILTROS
// ------------------------------------------------------------
function valoresUnicos(campo) {
    return [...new Set(datosOriginales.map(f => texto(f[campo])).filter(Boolean))].sort();
}

function llenarSelect(id, valores, inicial) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = "";

    const opcion = document.createElement("option");
    opcion.value = inicial;
    opcion.textContent = inicial;
    select.appendChild(opcion);

    valores.forEach(valor => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
    });
}

function inicializarFiltros() {
    llenarSelect("filtroLocalidad", valoresUnicos("localidad_eess"), "Todas");
    llenarSelect("filtroInspector", valoresUnicos("nombre_inspector"), "Todos");
    llenarSelect("filtroSector", valoresUnicos("sector"), "Todos");
    llenarSelect("filtroTipo", valoresUnicos("tipoActividadInspeccion"), "Todos");
    llenarSelect("filtroManzana", valoresUnicos("codigo_manzana"), "Todas");
    llenarSelect("filtroMes", MESES, "Todos");

    [
        "filtroLocalidad", "filtroMes", "filtroInspector",
        "filtroSector", "filtroTipo", "filtroManzana"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", actualizarDashboard);
    });
}

function valorFiltro(id, porDefecto) {
    const el = document.getElementById(id);
    return el ? texto(el.value) || porDefecto : porDefecto;
}

function aplicarFiltros() {
    const localidad = valorFiltro("filtroLocalidad", "Todas");
    const mes = valorFiltro("filtroMes", "Todos");
    const inspector = valorFiltro("filtroInspector", "Todos");
    const sector = valorFiltro("filtroSector", "Todos");
    const tipo = valorFiltro("filtroTipo", "Todos");
    const manzana = valorFiltro("filtroManzana", "Todas");

    datosFiltrados = datosOriginales.filter(fila => {
        if (localidad !== "Todas" && texto(fila.localidad_eess) !== localidad) return false;
        if (inspector !== "Todos" && texto(fila.nombre_inspector) !== inspector) return false;
        if (sector !== "Todos" && texto(fila.sector) !== sector) return false;
        if (tipo !== "Todos" && texto(fila.tipoActividadInspeccion) !== tipo) return false;
        if (manzana !== "Todas" && texto(fila.codigo_manzana) !== manzana) return false;

        if (mes !== "Todos") {
            const fecha = obtenerFecha(fila.fecha_inspeccion);
            if (!fecha || MESES[fecha.getMonth()] !== mes) return false;
        }

        if (busquedaInspector !== "") {
            if (!texto(fila.nombre_inspector).toLowerCase().includes(busquedaInspector)) return false;
        }

        return true;
    });
}

function actualizarDashboard() {
    aplicarFiltros();
    seguro("tarjetas", actualizarTarjetas);
    seguro("cobertura", actualizarCobertura);
    seguro("condicion", actualizarCondicion);
    seguro("ranking", actualizarRanking);
    seguro("mensual", actualizarMensual);
    seguro("sector", actualizarSector);
    seguro("inspector", actualizarInspector);
    seguro("localidad", actualizarLocalidad);
    seguro("tabla", actualizarTabla);
    seguro("mapa", actualizarMapa);
}

// ------------------------------------------------------------
// TARJETAS Y COBERTURA
// ------------------------------------------------------------
function actualizarTarjetas() {
    setTexto("totalInspeccionadas", fmt(datosFiltrados.filter(inspeccionada).length));
    setTexto("totalCerradas", fmt(datosFiltrados.filter(cerrada).length));
    setTexto("totalRenuentes", fmt(datosFiltrados.filter(renuente).length));
    setTexto("totalDeshabitadas", fmt(datosFiltrados.filter(deshabitada).length));
    setTexto("totalRecuperadas", fmt(datosFiltrados.filter(recuperada).length));
    setTexto(
        "totalInspectores",
        fmt(new Set(datosFiltrados.map(f => texto(f.nombre_inspector)).filter(Boolean)).size)
    );
}

function actualizarCobertura() {
    const inspeccionadas = datosFiltrados.filter(inspeccionada).length;
    const total = datosFiltrados.length;
    const viviendasBase = new Set(datosFiltrados.map(f => texto(f._uid)).filter(Boolean)).size;

    let porcentaje = total > 0 ? (inspeccionadas / total) * 100 : 0;
    if (!Number.isFinite(porcentaje)) porcentaje = 0;
    porcentaje = Number(Math.min(100, Math.max(0, porcentaje)).toFixed(1));

    setTexto("coveragePercent", porcentaje + "%");
    setTexto("coverageInspeccionadas", fmt(inspeccionadas));
    setTexto("coverageTotal", fmt(viviendasBase));

    const progreso = document.getElementById("coverageProgress");
    if (progreso) progreso.style.width = porcentaje + "%";

    crearGrafico("coverageChart", {
        type: "doughnut",
        data: {
            labels: ["Inspeccionadas", "No inspeccionadas"],
            datasets: [{
                data: [porcentaje, 100 - porcentaje],
                backgroundColor: ["#269bb0", "#e8edf0"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: { legend: { display: false } }
        }
    });
}

// ------------------------------------------------------------
// GRÁFICOS
// ------------------------------------------------------------
function opcionesBarras(horizontal) {
    const eje = { beginAtZero: true };
    return {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: horizontal ? { x: eje } : { y: eje }
    };
}

function graficoBarras(id, etiquetas, valores, etiquetaSerie, color, horizontal) {
    crearGrafico(id, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{ label: etiquetaSerie, data: valores, backgroundColor: color }]
        },
        options: opcionesBarras(horizontal)
    });
}

function agruparInspeccionadas(campo, vacio) {
    const grupos = {};
    datosFiltrados.filter(inspeccionada).forEach(fila => {
        const clave = texto(fila[campo]) || vacio;
        grupos[clave] = (grupos[clave] || 0) + 1;
    });
    return Object.entries(grupos).sort((a, b) => b[1] - a[1]).slice(0, 15);
}

function actualizarCondicion() {
    const datos = [
        datosFiltrados.filter(inspeccionada).length,
        datosFiltrados.filter(cerrada).length,
        datosFiltrados.filter(renuente).length,
        datosFiltrados.filter(deshabitada).length,
        datosFiltrados.filter(recuperada).length
    ];

    graficoBarras(
        "conditionChart",
        ["Inspeccionadas", "Cerradas", "Renuentes", "Deshabitadas", "Recuperadas"],
        datos,
        "Viviendas",
        ["#5dade2", "#ed4149", "#f2aa12", "#7437a5", "#38aa43"],
        false
    );
}

function actualizarRanking() {
    const camposCriaderos = {
        "Tanque alto": ["tanque_alto_I", "tanque_alto_P", "tanque_alto_TQ", "tanque_alto_TF"],
        "Tanque bajo": ["tanque_bajo_I", "tanque_bajo_P", "tanque_bajo_TQ", "tanque_bajo_TF"],
        "Barril": ["barril_cilindro_I", "barril_cilindro_P", "barril_cilindro_TQ", "barril_cilindro_TF"],
        "Sanson / Bidón": ["sanson_bidon_I", "sanson_bidon_P", "sanson_bidon_TQ", "sanson_bidon_TF"],
        "Baldes": ["baldes_bateas_tinajas_I", "baldes_bateas_tinajas_P", "baldes_bateas_tinajas_TQ", "baldes_bateas_tinajas_TF"],
        "Llantas": ["llantas_I", "llantas_P", "llantas_TQ", "llantas_TF"],
        "Floreros": ["floreros_maceteros_I", "floreros_maceteros_P", "floreros_maceteros_TQ", "floreros_maceteros_TF"],
        "Latas": ["latas_botellas_I", "latas_botellas_P", "latas_botellas_TQ", "latas_botellas_TF"],
        "Otros": ["otros_I", "otros_P", "otros_TQ", "otros_TF", "otros_D"],
        "Inservibles": ["inservibles_I", "inservibles_P", "inservibles_TQ", "inservibles_TF"]
    };

    const ranking = Object.keys(camposCriaderos).map(nombre => {
        let total = 0;
        datosFiltrados.forEach(fila => {
            camposCriaderos[nombre].forEach(campo => { total += numero(fila[campo]); });
        });
        return { nombre, total };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    crearGrafico("rankingChart", {
        type: "bar",
        data: {
            labels: ranking.map(x => x.nombre),
            datasets: [{
                label: "Total",
                data: ranking.map(x => x.total),
                backgroundColor: [
                    "#ed4149", "#168fe0", "#38a947", "#f1ad18", "#7438a4",
                    "#e85aa5", "#7c8790", "#55aee8", "#1598aa", "#7bcfd8"
                ],
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: c => " Total: " + fmt(c.raw) }
                }
            },
            scales: {
                x: { beginAtZero: true, ticks: { callback: v => fmt(v) } },
                y: { ticks: { autoSkip: false, font: { size: 10 } } }
            }
        }
    });
}

function actualizarMensual() {
    const valores = MESES.map((_, indice) =>
        datosFiltrados.filter(fila => {
            const fecha = obtenerFecha(fila.fecha_inspeccion);
            return inspeccionada(fila) && fecha && fecha.getMonth() === indice;
        }).length
    );

    graficoBarras("monthlyChart", MESES, valores, "Viviendas inspeccionadas", "#75bce7", false);
}

function actualizarSector() {
    const o = agruparInspeccionadas("sector", "Sin sector");
    graficoBarras("sectorChart", o.map(x => x[0]), o.map(x => x[1]), "Inspeccionadas", "#75bce7", false);
}

function actualizarInspector() {
    const o = agruparInspeccionadas("nombre_inspector", "Sin inspector");
    graficoBarras("inspectorChart", o.map(x => x[0]), o.map(x => x[1]), "Viviendas", "#75bce7", true);
}

function actualizarLocalidad() {
    const o = agruparInspeccionadas("localidad_eess", "Sin localidad");
    graficoBarras("localityChart", o.map(x => x[0]), o.map(x => x[1]), "Viviendas", "#75bce7", false);
}

function crearGrafico(id, configuracion) {
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return;

    if (charts[id]) {
        try { charts[id].destroy(); } catch (e) {}
    }

    charts[id] = new Chart(canvas, configuracion);
}

// ------------------------------------------------------------
// TABLA
// ------------------------------------------------------------
function actualizarTabla() {
    const tbody = document.getElementById("tablaLocalidades");
    if (!tbody) return;

    const localidades = {};

    datosFiltrados.forEach(fila => {
        const loc = texto(fila.localidad_eess) || "Sin localidad";

        if (!localidades[loc]) {
            localidades[loc] = { inspeccionadas: 0, cerradas: 0, renuentes: 0, deshabitadas: 0, recuperadas: 0 };
        }

        if (inspeccionada(fila)) localidades[loc].inspeccionadas++;
        if (cerrada(fila)) localidades[loc].cerradas++;
        if (renuente(fila)) localidades[loc].renuentes++;
        if (deshabitada(fila)) localidades[loc].deshabitadas++;
        if (recuperada(fila)) localidades[loc].recuperadas++;
    });

    tbody.innerHTML = "";

    Object.entries(localidades)
        .sort((a, b) => b[1].inspeccionadas - a[1].inspeccionadas)
        .forEach(([localidad, v]) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${localidad}</td>
                <td>${fmt(v.inspeccionadas)}</td>
                <td>${fmt(v.cerradas)}</td>
                <td>${fmt(v.renuentes)}</td>
                <td>${fmt(v.deshabitadas)}</td>
                <td>${fmt(v.recuperadas)}</td>
            `;
            tbody.appendChild(tr);
        });
}

// ------------------------------------------------------------
// MAPA
// ------------------------------------------------------------
function inicializarMapa() {
    const elemento = document.getElementById("map");
    if (!elemento || typeof L === "undefined" || mapa) return;

    mapa = L.map("map").setView([-6.4869, -76.3625], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(mapa);
}

function actualizarMapa() {
    if (!mapa) return;

    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];

    let contador = 0;

    datosFiltrados.filter(inspeccionada).forEach(fila => {
        if (contador >= 1500) return;

        const lat = numero(fila.georeferencia_Y);
        const lng = numero(fila.georeferencia_X);

        if (!lat || !lng) return;
        if (lat < -20 || lat > 5 || lng < -85 || lng > -65) return;

        const marcador = L.circleMarker([lat, lng], {
            radius: 4,
            color: "#078ca5",
            fillColor: "#269bb0",
            fillOpacity: 0.55,
            weight: 1
        })
        .bindPopup(`
            <strong>Vivienda inspeccionada</strong><br>
            📍 ${texto(fila.localidad_eess)}<br>
            🏠 ${texto(fila.direccion)}<br>
            👤 ${texto(fila.nombre_inspector)}
        `)
        .addTo(mapa);

        marcadores.push(marcador);
        contador++;
    });
}

// ------------------------------------------------------------
// BUSCADOR DE INSPECTOR CON SUGERENCIAS
// ------------------------------------------------------------
function buscarInspector() {
    const input = document.getElementById("busquedaInspector");
    busquedaInspector = texto(input ? input.value : "").toLowerCase();
    actualizarDashboard();
}

function configurarBuscadorSugerencias() {
    const input = document.getElementById("busquedaInspector");
    const select = document.getElementById("filtroInspector");
    if (!input || !select) return;

    const sugerencias = document.createElement("div");
    sugerencias.id = "sugerenciasInspector";
    Object.assign(sugerencias.style, {
        position: "absolute",
        background: "#ffffff",
        border: "1px solid #cfdce3",
        borderRadius: "8px",
        left: "0",
        right: "0",
        top: "100%",
        maxHeight: "200px",
        overflowY: "auto",
        zIndex: "99999",
        display: "none",
        boxShadow: "0 4px 10px rgba(0,0,0,0.12)"
    });

    if (input.parentElement) {
        input.parentElement.style.position = "relative";
        input.parentElement.appendChild(sugerencias);
    }

    function ocultar() {
        sugerencias.innerHTML = "";
        sugerencias.style.display = "none";
    }

    function seleccionar(nombre) {
        const op = [...select.options].find(
            o => texto(o.value).toLowerCase() === nombre.toLowerCase()
        );
        if (!op) return;

        select.value = op.value;
        input.value = "";
        busquedaInspector = "";
        ocultar();
        actualizarDashboard();
    }

    function coincidencias(busqueda) {
        return valoresUnicos("nombre_inspector").filter(n => n.toLowerCase().includes(busqueda));
    }

    input.addEventListener("input", function () {
        const busqueda = input.value.trim().toLowerCase();
        sugerencias.innerHTML = "";
        busquedaInspector = "";

        if (!busqueda) {
            ocultar();
            return;
        }

        const resultados = coincidencias(busqueda);

        resultados.slice(0, 20).forEach(nombre => {
            const opcion = document.createElement("div");
            opcion.textContent = nombre;
            Object.assign(opcion.style, {
                padding: "9px 12px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#16405a",
                background: "#ffffff"
            });
            opcion.addEventListener("mouseenter", () => { opcion.style.background = "#e8f7fa"; });
            opcion.addEventListener("mouseleave", () => { opcion.style.background = "#ffffff"; });
            opcion.addEventListener("click", () => seleccionar(nombre));
            sugerencias.appendChild(opcion);
        });

        sugerencias.style.display = resultados.length > 0 ? "block" : "none";
    });

    input.addEventListener("keydown", function (evento) {
        if (evento.key !== "Enter") return;
        evento.preventDefault();

        const busqueda = input.value.trim().toLowerCase();
        if (!busqueda) return;

        const primero = coincidencias(busqueda)[0];
        if (primero) seleccionar(primero);
    });

    select.addEventListener("change", function () {
        input.value = "";
        busquedaInspector = "";
        ocultar();
    });

    document.addEventListener("click", function (evento) {
        if (evento.target !== input && !sugerencias.contains(evento.target)) {
            sugerencias.style.display = "none";
        }
    });
}

// ------------------------------------------------------------
// DESCARGAS A EXCEL (SEGÚN FILTROS ACTUALES)
// ------------------------------------------------------------
function configurarBotones() {
    const botonBuscar = document.getElementById("btnBuscarInspector");
    if (botonBuscar) botonBuscar.onclick = buscarInspector;

    const loc = document.getElementById("btnExcelLocalidad");
    if (loc) loc.onclick = descargarDetallesLocalidad;

    const insp = document.getElementById("btnExcelInspector");
    if (insp) insp.onclick = descargarViviendasInspector;

    const dir = document.getElementById("btnExcelDirecciones");
    if (dir) dir.onclick = descargarDirecciones;
}

function obtenerDatosParaDescarga() {
    aplicarFiltros();
    return Array.isArray(datosFiltrados) ? [...datosFiltrados] : [];
}

function asegurarExcel(callback) {
    if (typeof XLSX !== "undefined") {
        callback();
        return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = callback;
    script.onerror = () => alert("No se pudo cargar la herramienta de Excel.");
    document.head.appendChild(script);
}

function descargarExcelSeguro(datos, nombreArchivo) {
    if (!datos || datos.length === 0) {
        alert("No hay datos para descargar con los filtros actuales.");
        return;
    }

    asegurarExcel(function () {
        const hoja = XLSX.utils.json_to_sheet(datos);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Datos");
        XLSX.writeFile(libro, nombreArchivo + ".xlsx");
    });
}

function descargarDetallesLocalidad() {
    const datosActuales = obtenerDatosParaDescarga();
    const resumen = {};

    datosActuales.forEach(fila => {
        const localidad = texto(fila.localidad_eess) || "Sin localidad";

        if (!resumen[localidad]) {
            resumen[localidad] = {
                "Localidad": localidad,
                "Total de registros": 0,
                "Inspeccionadas": 0,
                "Cerradas": 0,
                "Renuentes": 0,
                "Deshabitadas": 0,
                "Recuperadas": 0
            };
        }

        resumen[localidad]["Total de registros"]++;
        if (inspeccionada(fila)) resumen[localidad].Inspeccionadas++;
        if (cerrada(fila)) resumen[localidad].Cerradas++;
        if (renuente(fila)) resumen[localidad].Renuentes++;
        if (deshabitada(fila)) resumen[localidad].Deshabitadas++;
        if (recuperada(fila)) resumen[localidad].Recuperadas++;
    });

    descargarExcelSeguro(Object.values(resumen), "Detalles_por_localidad");
}

function descargarViviendasInspector() {
    const resultado = obtenerDatosParaDescarga().map(fila => ({
        "Inspector": texto(fila.nombre_inspector),
        "Estado": estadoVivienda(fila),
        "Fecha de inspección": texto(fila.fecha_inspeccion),
        "Localidad": texto(fila.localidad_eess),
        "Sector": texto(fila.sector),
        "Código de manzana": texto(fila.codigo_manzana),
        "Dirección": texto(fila.direccion),
        "Tipo de inspección": texto(fila.tipoActividadInspeccion),
        "Persona que atiende": texto(fila.persona_atiende),
        "Número de residentes": texto(fila.numero_residentes),
        "Hora de ingreso": texto(fila.hora_ingreso),
        "Hora de salida": texto(fila.hora_salida)
    }));

    descargarExcelSeguro(resultado, "Viviendas_por_inspector");
}

function descargarDirecciones() {
    const resultado = obtenerDatosParaDescarga().map(fila => ({
        "Estado": estadoVivienda(fila),
        "Localidad": texto(fila.localidad_eess),
        "Dirección": texto(fila.direccion),
        "Código de manzana": texto(fila.codigo_manzana),
        "Inspector": texto(fila.nombre_inspector),
        "Fecha de inspección": texto(fila.fecha_inspeccion),
        "Tipo de inspección": texto(fila.tipoActividadInspeccion),
        "Sector": texto(fila.sector),
        "Persona que atiende": texto(fila.persona_atiende),
        "Número de residentes": texto(fila.numero_residentes),
        "Hora de ingreso": texto(fila.hora_ingreso),
        "Hora de salida": texto(fila.hora_salida)
    }));

    descargarExcelSeguro(resultado, "Direcciones_filtradas");
}

console.log("Dashboard Dengue cargado correctamente.");