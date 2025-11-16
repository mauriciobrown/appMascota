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



// --- Guardar tratamiento ---
const form = document.getElementById("formTratamiento");
if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const mascotaId = parseInt(document.getElementById("mascotaSelect").value, 10);
    const catalogoId = parseInt(document.getElementById("tratamientoSelect").value, 10);
    const fechaAplicacion = document.getElementById("fechaAplicacion").value;
    const frecuenciaManualInput = document.getElementById("frecuenciaManual");
    const frecuenciaManual = frecuenciaManualInput ? parseInt(frecuenciaManualInput.value, 10) || null : null;

    if (!mascotaId || !catalogoId || !fechaAplicacion) {
      alert("Completa todos los campos.");
      return;
    }

    // Obtener frecuencia del catálogo
    db.executeSql("SELECT nombre, frecuencia_dias FROM catalogo_tratamientos WHERE id = ?", [catalogoId], function (res) {
      const tipo = res.rows.item(0).nombre;
      const frecuencia = tipo === "Otros" ? frecuenciaManual : res.rows.item(0).frecuencia_dias;

      if (tipo === "Otros" && !frecuencia) {
        alert("Debes ingresar la frecuencia en días para tratamientos tipo 'Otros'.");
        return;
      }

      // --- Calcular fecha próxima ---
      const fechaProxima = calcularProximaFecha(fechaAplicacion, frecuencia);
      if (!fechaProxima || fechaProxima === "No definido") {
        alert("No se pudo calcular la fecha próxima. Verifica la frecuencia.");
        return;
      }

      // --- Insertar tratamiento en DB ---
      db.transaction(function (tx) {
        tx.executeSql(
          "INSERT INTO tratamientos (mascota_id, catalogo_id, fecha_aplicacion, frecuencia_dias, fecha_proxima) VALUES (?, ?, ?, ?, ?)",
          [mascotaId, catalogoId, fechaAplicacion, frecuencia, fechaProxima],
          function () {
            const mascotaNombre = document.getElementById("mascotaSelect").selectedOptions[0].textContent;

            // --- Crear evento en calendario ---
         const fechaProximaDate = new Date(fechaProxima);

              crearEventoCalendario(
                `💊 ${tipo} para ${mascotaNombre}`,
                `Tratamiento programado para ${fechaProxima}`,
                fechaProximaDate,
                fechaProximaDate
              ).then(eventId => {
              // Nueva transacción solo para actualizar calendar_event_id
              db.transaction(function(tx2){
                tx2.executeSql(
                  "UPDATE tratamientos SET calendar_event_id=? WHERE rowid=last_insert_rowid()",
                  [eventId]
                );
              });
            }).catch(err => console.error("Error creando evento calendario:", err));

            alert("Tratamiento guardado.");
            form.reset();
            const frecuenciaContainer = document.getElementById("frecuenciaContainer");
            if (frecuenciaContainer) frecuenciaContainer.style.display = "none";
            cargarTratamientos();
          },
          function (error) {
            console.error("Error al guardar tratamiento:", error.message);
          }
        );
      });

    }); // cierre de db.executeSql
  }); // cierre de submit
}





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

});