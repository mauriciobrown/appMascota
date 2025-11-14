var db = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });

  mostrarCumpleaños();
  mostrarTratamientosProximos();
});

function mostrarCumpleaños() {
  const hoy = new Date();
  const dentroDe10 = new Date();
  dentroDe10.setDate(hoy.getDate() + 10);

  db.executeSql("SELECT nombre, fecha_nacimiento FROM mascotas", [], function (res) {
    const lista = document.getElementById("alertasCumple");
    lista.innerHTML = "";

    for (let i = 0; i < res.rows.length; i++) {
      const m = res.rows.item(i);
      const fecha = new Date(m.fecha_nacimiento);
      fecha.setFullYear(hoy.getFullYear());

      // Si ya pasó este año, ajustamos al siguiente
      if (fecha < hoy) {
        fecha.setFullYear(hoy.getFullYear() + 1);
      }

      if (fecha >= hoy && fecha <= dentroDe10) {
        const item = document.createElement("li");
        item.textContent = `${m.nombre} cumple años el ${fecha.toISOString().split("T")[0]}`;
        lista.appendChild(item);
      }
    }
  });
}

function mostrarTratamientosProximos() {
  const hoy = new Date();
  const dentroDe10 = new Date();
  dentroDe10.setDate(hoy.getDate() + 10);

  db.executeSql(
    `SELECT t.tipo, t.fecha_aplicacion, t.frecuencia_dias, m.nombre AS mascota 
     FROM tratamientos t 
     JOIN mascotas m ON t.mascota_id = m.id`,
    [],
    function (res) {
      const lista = document.getElementById("alertasTratamientos");
      lista.innerHTML = "";

      for (let i = 0; i < res.rows.length; i++) {
        const t = res.rows.item(i);
        const fechaAplicacion = new Date(t.fecha_aplicacion);
        const fechaProxima = new Date(fechaAplicacion);
        fechaProxima.setDate(fechaAplicacion.getDate() + t.frecuencia_dias);

        if (fechaProxima >= hoy && fechaProxima <= dentroDe10) {
          const item = document.createElement("li");
          item.textContent = `${t.mascota} necesita ${t.tipo} el ${fechaProxima.toISOString().split("T")[0]}`;
          lista.appendChild(item);
        }
      }
    }
  );
}
