var db = null;

document.addEventListener("deviceready", function () {
  db = window.sqlitePlugin.openDatabase({ name: "petcare.db", location: "default" });
  cargarCatalogo();
});

// --- Cargar catálogo completo ---
function cargarCatalogo() {
  db.executeSql("SELECT * FROM catalogo_tratamientos ORDER BY nombre ASC", [], function (res) {
    const lista = document.getElementById("listaCatalogo");
    lista.innerHTML = "";

    for (let i = 0; i < res.rows.length; i++) {
      const t = res.rows.item(i);
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${t.nombre}</strong>
        <br>Frecuencia: ${t.frecuencia_dias ? t.frecuencia_dias + " días" : "No definido"}
        <div class="acciones">
          <button class="btn-editar" data-id="${t.id}">✏️ Editar</button>
          <button class="btn-eliminar" data-id="${t.id}">🗑️ Eliminar</button>
        </div>
      `;
      lista.appendChild(li);
    }

    // Wire botones
    lista.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", () => editarCatalogo(parseInt(btn.dataset.id, 10)));
    });
    lista.querySelectorAll(".btn-eliminar").forEach(btn => {
      btn.addEventListener("click", () => eliminarCatalogo(parseInt(btn.dataset.id, 10)));
    });
  });
}

// --- Editar frecuencia ---
function editarCatalogo(id) {
  db.executeSql("SELECT * FROM catalogo_tratamientos WHERE id = ?", [id], function (res) {
    if (res.rows.length === 0) return;
    const t = res.rows.item(0);

    const nuevaFrecuenciaStr = prompt(`Frecuencia en días para ${t.nombre}:`, t.frecuencia_dias || "");
    if (nuevaFrecuenciaStr === null) return;

    const nuevaFrecuencia = parseInt(nuevaFrecuenciaStr, 10);
    if (isNaN(nuevaFrecuencia)) {
      alert("Debes ingresar un número válido.");
      return;
    }

    db.transaction(function (tx) {
      tx.executeSql(
        "UPDATE catalogo_tratamientos SET frecuencia_dias = ? WHERE id = ?",
        [nuevaFrecuencia, id],
        function () {
          alert("Frecuencia actualizada.");
          cargarCatalogo();
        }
      );
    });
  });
}

// --- Eliminar tratamiento del catálogo ---
function eliminarCatalogo(id) {
  if (!confirm("¿Eliminar este tratamiento del catálogo?")) return;
  db.transaction(function (tx) {
    tx.executeSql("DELETE FROM catalogo_tratamientos WHERE id = ?", [id], function () {
      alert("Tratamiento eliminado.");
      cargarCatalogo();
    });
  });
}

// --- Agregar nuevo tratamiento ---
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("formNuevoTratamiento");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const nombre = document.getElementById("nuevoNombre").value.trim();
      const frecuencia = parseInt(document.getElementById("nuevoFrecuencia").value, 10) || null;

      if (!nombre) {
        alert("Debes ingresar un nombre.");
        return;
      }

      db.transaction(function (tx) {
        tx.executeSql(
          "INSERT INTO catalogo_tratamientos (nombre, frecuencia_dias) VALUES (?, ?)",
          [nombre, frecuencia],
          function () {
            alert("Tratamiento agregado.");
            form.reset();
            cargarCatalogo();
          },
          function (error) {
            alert("Error al agregar: " + error.message);
          }
        );
      });
    });
  }
});
