var db = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  cargarMascotas();
  cargarCatalogoTratamientos();
  cargarTratamientos();

  // --- Mostrar campo frecuencia si es "Otros" ---
  const selectTratamiento = document.getElementById("tratamientoSelect");
  if (selectTratamiento) {
    selectTratamiento.addEventListener("change", function () {
      const id = parseInt(this.value, 10);
      if (!id) return;
      db.executeSql("SELECT nombre FROM catalogo_tratamientos WHERE id = ?", [id], function (res) {
        const tipo = res.rows.item(0).nombre;
        const frecuenciaContainer = document.getElementById("frecuenciaContainer");
        if (frecuenciaContainer) {
          frecuenciaContainer.style.display = tipo === "Otros" ? "block" : "none";
        }
      });
    });
  }

// --- Bloque completo para js/tratamientos.js (corregido y robusto) ---

const form = document.getElementById("formTratamiento");

function normalizarFecha(fechaStr) {
    // Aseguramos que se use el formato YYYY-MM-DD para la BD y el objeto Date
    return fechaStr; 
}

if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        
        // 1. EXTRAER VARIABLES DEL FORMULARIO
        const mascotaId = parseInt(document.getElementById("mascotaSelect").value, 10);
        const catalogoId = parseInt(document.getElementById("tratamientoSelect").value, 10);
        const fechaAplicacion = normalizarFecha(document.getElementById("fechaAplicacion").value);
        
        const frecuenciaManualInput = document.getElementById("frecuenciaManual");
        const frecuenciaManual = frecuenciaManualInput ? parseInt(frecuenciaManualInput.value, 10) || null : null;
        

        // 2. VALIDACIÓN INICIAL
        if (!mascotaId || !catalogoId || !fechaAplicacion) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        // 3. INICIAR TRANSACCIÓN ÚNICA (Contiene SELECT e INSERT)
        db.transaction(function (tx) {
            // Paso 3a: CONSULTA al catálogo para obtener detalles
            tx.executeSql(
                "SELECT nombre, frecuencia_dias FROM catalogo_tratamientos WHERE id = ?",
                [catalogoId],
                function (tx, res) {
                    // Si no hay resultados, salimos
                    if (!res.rows || res.rows.length === 0) {
                        console.error("Tratamiento no encontrado en catálogo.");
                        alert("Error: Tratamiento seleccionado no válido.");
                        return;
                    }
                    
                    const tipo = res.rows.item(0).nombre;
                    // Determinar la frecuencia (manual si es 'Otros', sino de catálogo)
                    const frecuencia = tipo === "Otros" ? frecuenciaManual : res.rows.item(0).frecuencia_dias;

                    // Validación de frecuencia para "Otros"
                    if (tipo === "Otros" && (!frecuencia || frecuencia <= 0)) {
                        alert("Ingresa una frecuencia válida (en días) para el tratamiento 'Otros'.");
                        return;
                    }
                    
                    console.log(`[DEBUG] Tipo: ${tipo}, Frecuencia calculada: ${frecuencia}`);

                    // Paso 3b: INSERCIÓN del tratamiento
                    tx.executeSql(
                        "INSERT INTO tratamientos (mascota_id, catalogo_id, fecha_aplicacion, frecuencia_dias, calendar_event_id) VALUES (?, ?, ?, ?, NULL)",
                        [mascotaId, catalogoId, fechaAplicacion, frecuencia],
                        function (txOk, resInsert) {
                            const nuevoId = resInsert.insertId;

                            // 4. CALENDARIO: Crear evento recurrente (ASÍNCRONO)
// ... (dentro de la función de éxito del INSERT, después de 'const nuevoId = resInsert.insertId;')

// 4. CALENDARIO: Crear DOS eventos (Aplicación + Recurrencia)
                            

// 4. CALENDARIO: Crear evento recurrente (ASÍNCRONO - Versión Simple)
if (frecuencia && frecuencia > 0 && typeof crearEventoCalendario === 'function') {
    console.log("[DEBUG] Llamando a crearEventoCalendario (Versión Simple)...");
    
    // --- CONFIGURACIÓN DE FECHAS ---
    // El evento RECURRENTE ahora inicia en la fecha de aplicación (no en la próxima dosis)
    const fecha_str = fechaAplicacion + "T12:00:00"; 
    const inicio = new Date(fecha_str);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000); // Duración de 1 hora

    // Validación de fecha (¡IMPORTANTE!)
    if (isNaN(inicio.getTime())) {
        console.error("❌ La fecha de inicio del calendario no es válida:", fechaAplicacion);
    } else {
        console.log("[DEBUG] Fecha de Inicio (Date Object):", inicio);

        // Lógica de recurrencia
        let recurrenceType;
        if (frecuencia >= 365) {
            recurrenceType = 'YEARLY'; 
        } else if (frecuencia >= 28) {
            recurrenceType = 'MONTHLY'; 
        } else {
            recurrenceType = 'DAILY'; 
        }

        crearEventoCalendario(
            // Título genérico que abarca la aplicación y la recurrencia
            `TRATAMIENTO: ${tipo} (Cada ${frecuencia} días)`, 
            `Mascota ID ${mascotaId}. Última aplicación: ${fechaAplicacion}. Se repite a partir de hoy.`, // Notas
            inicio, // <-- INICIA EN LA FECHA DE APLICACIÓN
            fin, 
            recurrenceType, 
            frecuencia
        ).then(eventId => {
            if (eventId) {
                // Guardamos el ID del evento que inicia en la fecha de aplicación.
                actualizarEventoCalendarioId(nuevoId, eventId);
            } else {
                console.warn("[DEBUG] La creación del evento de calendario falló (sin ID de retorno).");
            }
        }).catch(error => {
            console.error("❌ ERROR ASÍNCRONO al crear evento de calendario (Simple):", error);
        });
    }
}



                            // 5. FINALIZAR 
                            alert("Tratamiento guardado.");
                            form.reset();
                            const frecuenciaContainer = document.getElementById("frecuenciaContainer");
                            if (frecuenciaContainer) frecuenciaContainer.style.display = "none";
                            cargarTratamientos();
                        },
                        function (tx, error) { // Error de la inserción
                            console.error("❌ Error al guardar tratamiento (INSERT):", error.message);
                        }
                    );

                },
                function (tx, error) { // Error de la consulta SELECT
                    console.error("❌ Error SELECT catálogo:", error.message);
                }
            );
        }, 
        function (error) { // Error de la transacción completa
            console.error("❌ Error grave en la transacción del tratamiento:", error.message);
        }
    );
    });
}



});

// --- Cargar mascotas ---
function cargarMascotas() {
  db.executeSql("SELECT * FROM mascotas", [], function (res) {
    const select = document.getElementById("mascotaSelect");
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona --</option>';
    for (let i = 0; i < res.rows.length; i++) {
      const m = res.rows.item(i);
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = m.nombre;
      select.appendChild(option);
    }
  });
}

// --- Cargar catálogo de tratamientos ---
function cargarCatalogoTratamientos() {
  db.executeSql("SELECT * FROM catalogo_tratamientos", [], function (res) {
    const select = document.getElementById("tratamientoSelect");
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona tratamiento --</option>';
    for (let i = 0; i < res.rows.length; i++) {
      const t = res.rows.item(i);
      const option = document.createElement("option");
      option.value = t.id;
      option.textContent = t.nombre;
      select.appendChild(option);
    }
  });
}

// --- Mostrar tratamientos asignados ---
function cargarTratamientos() {
  db.executeSql(
    `SELECT t.id, m.nombre AS mascota, c.nombre AS tipo, t.fecha_aplicacion, t.frecuencia_dias
     FROM tratamientos t
     JOIN mascotas m ON t.mascota_id = m.id
     JOIN catalogo_tratamientos c ON t.catalogo_id = c.id
     ORDER BY t.fecha_aplicacion DESC`,
    [],
    function (res) {
      const lista = document.getElementById("listaTratamientos");
      if (!lista) return;
      lista.innerHTML = "";

      for (let i = 0; i < res.rows.length; i++) {
        const t = res.rows.item(i);
        const fechaProxima = calcularProximaFecha(t.fecha_aplicacion, t.frecuencia_dias);
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${t.mascota}</strong> – ${t.tipo}<br>
          Aplicado: ${t.fecha_aplicacion}<br>
          Próximo: ${fechaProxima}
        `;
        lista.appendChild(li);
      }
    },
    function (error) {
      console.error("Error al cargar tratamientos:", error.message);
    }
  );
}

// --- Calcular próxima fecha ---
function calcularProximaFecha(fecha, dias) {
  if (!dias) return "No definido";
  const f = new Date(fecha);
  f.setDate(f.getDate() + dias);
  return f.toISOString().split("T")[0];
}


// ... (Tus funciones existentes como cargarTratamientos, calcularProximaFecha, etc.)

// --- FUNCIÓN COMPLETA PARA ACTUALIZAR EL EVENT ID (NUEVA) ---
function actualizarEventoCalendarioId(tratamientoId, eventId) {
    if (!db) {
        console.error("❌ DB no inicializada para actualizar el ID del evento.");
        return;
    }
    
    if (!eventId) {
        console.warn("⚠️ Event ID nulo o inválido, no se actualizará la tabla.");
        return;
    }

    // Usamos una nueva transacción para actualizar el registro
    db.transaction(function (tx) {
        tx.executeSql(
            "UPDATE tratamientos SET calendar_event_id = ? WHERE id = ?", 
            [eventId, tratamientoId],
            function (txOk, resUpdate) {
                console.log(`✅ Tratamiento ID ${tratamientoId} actualizado con calendar_event_id: ${eventId}`);
            },
            function (txError, error) {
                console.error(`❌ Error al actualizar calendar_event_id para Tratamiento ID ${tratamientoId}:`, error.message);
            }
        );
    }, function (error) {
        console.error("❌ Error en la transacción de actualización del calendar_event_id:", error.message);
    });
}