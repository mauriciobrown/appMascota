var db = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  // Botón de prueba de alerta
  const btnTest = document.getElementById("btnTestAlerta");
  if (btnTest) {
    btnTest.addEventListener("click", function () {
      setTimeout(() => {
        cordova.plugins.notification.local.schedule({
          id: 9999,
          title: "🔔 Prueba de Alerta",
          text: "Esta es una notificación de prueba.",
          trigger: { in: 5 }
        });
        console.log("Notificación de prueba programada.");
      }, 500);
    });
  }

  // Cargar cumpleaños de mascotas
  cargarAlertasCumple();

  // Cargar tratamientos próximos
  cargarAlertasTratamientos();
});

// --- Cumpleaños ---
function cargarAlertasCumple() {
  db.executeSql("SELECT id, nombre, fecha_nacimiento FROM mascotas", [], function (res) {
    const lista = document.getElementById("alertasCumple");
    lista.innerHTML = "";

    const hoy = new Date().toISOString().split("T")[0];
    const fechaHoy = hoy.slice(5); // MM-DD

    for (let i = 0; i < res.rows.length; i++) {
      const m = res.rows.item(i);
      const cumple = m.fecha_nacimiento;
      const fechaMascota = cumple.slice(5);

      if (fechaHoy === fechaMascota) {
        const li = document.createElement("li");
        li.textContent = `🎉 Hoy es el cumpleaños de ${m.nombre}`;
        lista.appendChild(li);
      }
    }
  });
}
// --- Tratamientos próximos ---
function cargarAlertasTratamientos() {
  db.executeSql(
    `SELECT t.id, c.nombre AS tipo, t.fecha_aplicacion, t.frecuencia_dias, m.nombre AS mascota
     FROM tratamientos t
     JOIN catalogo_tratamientos c ON t.catalogo_id = c.id
     JOIN mascotas m ON t.mascota_id = m.id`,
    [],
    function (res) {
      const lista = document.getElementById("alertasTratamientos");
      lista.innerHTML = "";

      const hoy = new Date();

      for (let i = 0; i < res.rows.length; i++) {
        const t = res.rows.item(i);
        if (!t.frecuencia_dias) continue;

        const fechaAplicacion = new Date(t.fecha_aplicacion);
        const proxima = new Date(fechaAplicacion);
        proxima.setDate(proxima.getDate() + t.frecuencia_dias);

        // Mostrar alerta si la próxima fecha es hoy o dentro de los próximos 10 días
        const diff = (proxima - hoy) / (1000 * 60 * 60 * 24);
        if (diff >= 0 && diff <= 10) {
          const li = document.createElement("li");
          li.textContent = `💊 ${t.tipo} para ${t.mascota} el ${proxima.toISOString().split("T")[0]}`;
          lista.appendChild(li);
        }
      }
    }
  );
}
