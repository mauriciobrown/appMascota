var db = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  // Crear tabla si no existe
  db.transaction(function (tx) {
    tx.executeSql(
      "CREATE TABLE IF NOT EXISTS tratamientos (id INTEGER PRIMARY KEY AUTOINCREMENT, mascota_id INTEGER, tipo TEXT, fecha_aplicacion TEXT, frecuencia_dias INTEGER)"
    );
  });

  cargarMascotas();
  cargarTratamientos();
});

// --- Cargar mascotas en el selector ---
function cargarMascotas() {
  db.executeSql("SELECT * FROM mascotas", [], function (res) {
    const select = document.getElementById("mascotaSelect");
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

// --- Guardar tratamiento ---
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("formTratamiento");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const mascotaId = document.getElementById("mascotaSelect").value;
      const tipo = document.getElementById("tratamiento").value; // 👈 corregido
      const fechaAplicacion = document.getElementById("fechaAplicacion").value;

      if (!mascotaId || !tipo || !fechaAplicacion) {
        alert("Completa todos los campos.");
        return;
      }

      // Frecuencia según tipo (ajusta según tu lógica)
      let frecuencia = 90;
      if (tipo === "vacuna") frecuencia = 365;
      if (tipo === "desparasitacion") frecuencia = 180;
      if (tipo === "bravecto") frecuencia = 90;

      db.transaction(function (tx) {
        tx.executeSql(
          "INSERT INTO tratamientos (mascota_id, tipo, fecha_aplicacion, frecuencia_dias) VALUES (?, ?, ?, ?)",
          [mascotaId, tipo, fechaAplicacion, frecuencia],
          function () {
            alert("Tratamiento guardado.");
            programarAlerta(mascotaId, tipo, fechaAplicacion, frecuencia);
            document.getElementById("formTratamiento").reset();
            cargarTratamientos();
          },
          function (error) {
            console.error("Error al guardar tratamiento:", error.message);
          }
        );
      });
    });
  }
});

// --- Mostrar tratamientos ---
function cargarTratamientos() {
  db.executeSql(
    `SELECT t.*, m.nombre AS mascota 
     FROM tratamientos t 
     JOIN mascotas m ON t.mascota_id = m.id`,
    [],
    function (res) {
      const lista = document.getElementById("listaTratamientos");
      lista.innerHTML = "";

      for (let i = 0; i < res.rows.length; i++) {
        const t = res.rows.item(i);
        const fechaProxima = calcularProximaFecha(t.fecha_aplicacion, t.frecuencia_dias);
        const item = document.createElement("li");
        item.innerHTML = `
          <strong>${t.mascota}</strong> - ${t.tipo}<br>
          Aplicado: ${t.fecha_aplicacion}<br>
          Próximo: ${fechaProxima}
        `;
        lista.appendChild(item);
      }
    },
    function (error) {
      console.error("Error al cargar tratamientos:", error.message);
    }
  );
}

// --- Calcular próxima fecha ---
function calcularProximaFecha(fecha, dias) {
  const f = new Date(fecha);
  f.setDate(f.getDate() + dias);
  return f.toISOString().split("T")[0];
}

// --- Programar alerta 10 días antes ---
function programarAlerta(mascotaId, tipo, fechaAplicacion, frecuencia) {
  db.executeSql("SELECT nombre FROM mascotas WHERE id = ?", [mascotaId], function (res) {
    if (res.rows.length > 0) {
      const nombre = res.rows.item(0).nombre;
      const fechaProxima = new Date(fechaAplicacion);
      fechaProxima.setDate(fechaProxima.getDate() + frecuencia - 10);

      cordova.plugins.notification.local.schedule({
        title: "Tratamiento próximo",
        text: `A ${nombre} le toca ${tipo} en 10 días.`,
        trigger: { at: fechaProxima },
        foreground: true
      });
    }
  });
}
