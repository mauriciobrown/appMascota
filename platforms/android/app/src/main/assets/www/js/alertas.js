var db = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

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
      if (!m.fecha_nacimiento) continue;

      const fechaMascota = m.fecha_nacimiento.slice(5);

      if (fechaHoy === fechaMascota) {
        const li = document.createElement("li");
        li.textContent = `🎉 Hoy es el cumpleaños de ${m.nombre}`;
        lista.appendChild(li);

        // Programar notificación sonora inmediata
        if (cordova.plugins && cordova.plugins.notification) {
          cordova.plugins.notification.local.schedule({
            id: 1000 + m.id,
            title: `🎉 Cumpleaños de ${m.nombre}`,
            text: "Hoy es el cumpleaños de tu mascota.",
            trigger: { in: 1 },
            sound: null
          });
        }
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
        if (isNaN(fechaAplicacion.getTime())) continue;

        const proxima = new Date(fechaAplicacion);
        proxima.setDate(proxima.getDate() + t.frecuencia_dias);

        const diffDias = (proxima - hoy) / (1000 * 60 * 60 * 24);
        const proximaISO = proxima.toISOString().split("T")[0];

        // Mostrar en lista si es hoy o dentro de los próximos 10 días
        if (diffDias >= 0 && diffDias <= 10) {
          const li = document.createElement("li");
          li.textContent = `💊 ${t.tipo} para ${t.mascota} el ${proximaISO}`;
          lista.appendChild(li);

          // Programar notificación sonora
          if (cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.local.schedule({
              id: 2000 + t.id,
              title: `💊 ${t.tipo} para ${t.mascota}`,
              text: `Tratamiento programado para ${proximaISO}`,
              trigger: { at: new Date(proxima.getFullYear(), proxima.getMonth(), proxima.getDate(), 9, 0, 0) },
              sound: null
            });
          }
        }
      }
    }
  );
}
